const notificationModel = require("../models/notificationModel");

// GET /api/notifications  — get all for logged-in user
async function getMyNotifications(req, res) {
  try {
    const notifications = await notificationModel.getNotifications(req.user.email);
    res.json({ success: true, data: notifications });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/notifications/unread-count
async function getUnreadCount(req, res) {
  try {
    const count = await notificationModel.getUnreadCount(req.user.email);
    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// PATCH /api/notifications/:id/read  — mark one as read
async function markRead(req, res) {
  try {
    await notificationModel.markRead(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// PATCH /api/notifications/mark-all-read  — mark all as read
async function markAllRead(req, res) {
  try {
    await notificationModel.markAllRead(req.user.email);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// DELETE /api/notifications/:id
async function deleteNotification(req, res) {
  try {
    await notificationModel.deleteNotification(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
};
