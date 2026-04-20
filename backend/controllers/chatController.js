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

module.exports = { getConversations, getMessages, getUnread };