const chatModel = require("../models/chatModel");

// GET /api/chat/conversations  — inbox for current user
async function getConversations(req, res) {
  try {
    const data = await chatModel.getConversations(req.user.email, req.user.org);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/chat/messages/:roomId  — message history for a room
async function getMessages(req, res) {
  try {
    const { roomId } = req.params;
    const messages = await chatModel.getMessages(roomId);
    // Mark as read when fetched
    await chatModel.markRead(roomId, req.user.email);
    res.json({ success: true, data: messages });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/chat/unread  — unread count badge
async function getUnread(req, res) {
  try {
    const count = await chatModel.countUnread(req.user.email);
    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// PATCH /api/chat/messages/:id
async function editMessage(req, res) {
  try {
    const { newText } = req.body;
    if (!newText?.trim()) return res.status(400).json({ success: false, message: "Text required" });
    await chatModel.editMessage(req.params.id, newText.trim());
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
 
// DELETE /api/chat/messages/:id
async function deleteMessage(req, res) {
  try {
    await chatModel.deleteMessage(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { getConversations, getMessages, getUnread, editMessage, deleteMessage,};