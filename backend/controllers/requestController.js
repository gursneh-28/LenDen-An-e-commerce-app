const requestModel      = require("../models/requestModel");
const notificationModel = require("../models/notificationModel");

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
      success: true,
      message: "Request submitted",
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

// PATCH /api/requests/:id/resolve
// Called by the helper (not the requester) to mark a request resolved
async function resolveRequest(req, res) {
  try {
    const { id } = req.params;

    const request = await requestModel.getRequestById(id);
    if (!request)
      return res.status(404).json({ success: false, message: "Request not found" });

    // Can't resolve your own request
    if (request.requestedBy === req.user.email)
      return res.status(400).json({ success: false, message: "You cannot resolve your own request" });

    await requestModel.resolveRequest(id, req.user.email);

    // Notify the requester that their request was resolved
    await notificationModel.createNotification({
      recipientEmail: request.requestedBy,
      type:           "help",
      title:          "Your request was resolved",
      body:           `${req.user.name || req.user.email} marked your request "${request.work?.slice(0, 60)}" as resolved.`,
      meta:           { requestId: id, resolvedBy: req.user.email },
      org:            req.user.org,
    });

    res.json({ success: true, message: "Request resolved" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
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
  resolveRequest,
  deleteRequest,
};