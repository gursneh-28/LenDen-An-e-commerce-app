const mongoDB = require("../config/db");

const col = () => mongoDB.getCollection("notifications");

async function createNotification({ recipientEmail, type, title, body, meta = {}, org }) {
  const c = await col();
  return await c.insertOne({
    recipientEmail,
    type,      // "order" | "chat" | "rating" | "help"
    title,
    body,
    meta,      // { orderId, itemName, senderName, requestId, etc. }
    org,
    read: false,
    createdAt: new Date(),
  });
}

async function getNotifications(recipientEmail) {
  const c = await col();
  return await c.find({ recipientEmail }).sort({ createdAt: -1 }).limit(50).toArray();
}

async function getUnreadCount(recipientEmail) {
  const c = await col();
  return await c.countDocuments({ recipientEmail, read: false });
}

async function markRead(notificationId) {
  const { ObjectId } = require("mongodb");
  const c = await col();
  return await c.updateOne({ _id: new ObjectId(notificationId) }, { $set: { read: true } });
}

async function markAllRead(recipientEmail) {
  const c = await col();
  return await c.updateMany({ recipientEmail, read: false }, { $set: { read: true } });
}

async function deleteNotification(notificationId) {
  const { ObjectId } = require("mongodb");
  const c = await col();
  return await c.deleteOne({ _id: new ObjectId(notificationId) });
}

module.exports = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
};
