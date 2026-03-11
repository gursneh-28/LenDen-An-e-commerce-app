const requestModel = require("../models/requestModel");

async function createRequest(req, res) {
  try {
    const { work, price } = req.body;

    if (!work || !price) {
      return res.status(400).json({ success: false, message: "Work and price are required" });
    }

    const result = await requestModel.createRequest({
      work,
      price: Number(price),
      requestedBy: req.user.email,    
      requesterName: req.user.name,
      org: req.user.org,   
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
    const requests = await requestModel.getAllRequests(req.user.org);   // ⭐ pass org
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
    const { work, price } = req.body;

    const request = await requestModel.getRequestById(id);
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    if (request.requestedBy !== req.user.email) {
      return res.status(403).json({ success: false, message: "Not authorised" });
    }

    await requestModel.updateRequest(id, { work, price: Number(price) });
    res.json({ success: true, message: "Request updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteRequest(req, res) {
  try {
    const { id } = req.params;

    const request = await requestModel.getRequestById(id);
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    // Only the owner can delete
    if (request.requestedBy !== req.user.email) {
      return res.status(403).json({ success: false, message: "Not authorised" });
    }

    await requestModel.deleteRequest(id);
    res.json({ success: true, message: "Request deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { createRequest, getRequests, getMyRequests, updateRequest, deleteRequest };