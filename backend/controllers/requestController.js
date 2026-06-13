const requestModel      = require("../models/requestModel");
const notificationModel = require("../models/notificationModel");
const paymentModel      = require("../models/paymentModel");
const walletModel       = require("../models/walletModel");
const userModel         = require("../models/userModel");
const orgRequestModel   = require("../models/orgRequestModel");

// Commission rates
const REQUEST_COMMISSION_PCT = 0.10;  // 10% total — 5% admin, 5% super admin

async function createRequest(req, res) {
  try {
    const { work, price, category } = req.body;

    if (!work || !price)
      return res.status(400).json({ success: false, message: "Work and price are required" });

    const result = await requestModel.createRequest({
      work,
      price:         Number(price),
      category:      category || "other",
      requestedBy:   req.user.email,
      requesterName: req.user.name,
      org:           req.user.org,
      status:        "open",
    });

    res.status(201).json({
      success:   true,
      message:   "Request submitted",
      requestId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getRequests(req, res) {
  try {
    const requests = await requestModel.getAllRequests(req.user.org);
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getMyRequests(req, res) {
  try {
    const requests = await requestModel.getRequestsByEmail(req.user.email);
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateRequest(req, res) {
  try {
    const { id } = req.params;
    const { work, price, category } = req.body;

    const request = await requestModel.getRequestById(id);
    if (!request)
      return res.status(404).json({ success: false, message: "Request not found" });

    if (request.requestedBy !== req.user.email)
      return res.status(403).json({ success: false, message: "Not authorised" });

    const updateFields = { work, price: Number(price) };
    if (category) updateFields.category = category;

    await requestModel.updateRequest(id, updateFields);
    res.json({ success: true, message: "Request updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─── POST /api/requests/:id/pay ───────────────────────────────────────────────
// Called by the REQUESTER to pay the helper after agreeing via chat.
// Flow: requester initiates Razorpay payment → verified → resolve happens atomically.
// Commission (10%) is split: 5% logged to org admin wallet, 5% to super admin wallet.
async function payAndResolveRequest(req, res) {
  try {
    const { id } = req.params;
    const { paymentId, helperEmail } = req.body;

    if (!paymentId || !helperEmail) {
      return res.status(400).json({ success: false, message: "paymentId and helperEmail are required" });
    }

    const request = await requestModel.getRequestById(id);
    if (!request)
      return res.status(404).json({ success: false, message: "Request not found" });

    // Only the requester can pay
    if (request.requestedBy !== req.user.email)
      return res.status(403).json({ success: false, message: "Only the requester can pay" });

    if (request.status === "resolved")
      return res.status(400).json({ success: false, message: "Request already resolved" });

    // Verify payment exists and is valid
    const paymentValid = await paymentModel.isValidPaidPayment(paymentId, "request_payment");
    if (!paymentValid) {
      return res.status(402).json({ success: false, message: "Payment not verified. Complete payment first." });
    }

    // Calculate commission split
    const totalAmount       = Number(request.price);
    const totalCommission   = Math.round(totalAmount * REQUEST_COMMISSION_PCT);
    const adminCommission   = Math.round(totalCommission / 2);   // 5% to org admin
    const superAdminCommission = totalCommission - adminCommission; // 5% to super admin
    const helperReceives    = totalAmount - totalCommission;

    // Get org admin email for wallet tracking
    let adminEmail = null;
    try {
      const orgInfo = await orgRequestModel.findApprovedByOrg(req.user.org);
      adminEmail = orgInfo?.adminEmail || null;
    } catch (_) {}

    // Log commission to wallet — two entries, one per recipient
    await walletModel.logCommission({
      type:             "request_commission",
      amount:           adminCommission * 100,   // store in paise like Razorpay
      orgId:            req.user.org,
      userId:           req.user._id || req.user.id,
      recipient:        "admin",
      recipientEmail:   adminEmail,
      relatedPaymentId: paymentId,
      relatedEntityId:  id,
      helperEmail,
      helperReceives:   helperReceives * 100,
    });

    await walletModel.logCommission({
      type:             "request_commission",
      amount:           superAdminCommission * 100,
      orgId:            req.user.org,
      userId:           req.user._id || req.user.id,
      recipient:        "super_admin",
      relatedPaymentId: paymentId,
      relatedEntityId:  id,
      helperEmail,
    });

    // Mark request as resolved
    await requestModel.resolveRequest(id, helperEmail, paymentId);

    // Notify helper
    await notificationModel.createNotification({
      recipientEmail: helperEmail,
      type:           "help",
      title:          "Payment received for your help!",
      body:           `${req.user.name || req.user.email} paid ₹${helperReceives} for "${request.work?.slice(0, 50)}". Platform fee: ₹${totalCommission}.`,
      meta:           { requestId: id, amount: helperReceives },
      org:            req.user.org,
    });

    // Notify requester
    await notificationModel.createNotification({
      recipientEmail: request.requestedBy,
      type:           "help",
      title:          "Request resolved!",
      body:           `Your request "${request.work?.slice(0, 50)}" has been resolved. ₹${totalAmount} paid (platform fee ₹${totalCommission}).`,
      meta:           { requestId: id },
      org:            req.user.org,
    });

    res.json({
      success:            true,
      message:            "Payment successful. Request resolved.",
      totalPaid:          totalAmount,
      platformCommission: totalCommission,
      helperReceives,
    });

  } catch (error) {
    console.error("payAndResolveRequest error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─── PATCH /api/requests/:id/resolve ─────────────────────────────────────────
// Now blocked — must use /pay instead. Kept for backward compat but returns 402.
async function resolveRequest(req, res) {
  return res.status(402).json({
    success: false,
    message: "Direct resolve is disabled. Use POST /api/requests/:id/pay to pay and resolve.",
  });
}

async function deleteRequest(req, res) {
  try {
    const { id } = req.params;

    const request = await requestModel.getRequestById(id);
    if (!request)
      return res.status(404).json({ success: false, message: "Request not found" });

    if (request.requestedBy !== req.user.email)
      return res.status(403).json({ success: false, message: "Not authorised" });

    await requestModel.deleteRequest(id);
    res.json({ success: true, message: "Request deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createRequest,
  getRequests,
  getMyRequests,
  updateRequest,
  payAndResolveRequest,
  resolveRequest,
  deleteRequest,
};