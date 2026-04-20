const mongoDB = require("../config/db");
const { ObjectId } = require("mongodb");

const msgs  = () => mongoDB.getCollection("messages");
const convs = () => mongoDB.getCollection("conversations");

async function upsertConversation(roomId, data) {
  const c = await convs();
  await c.updateOne(
    { roomId },
    { $set: { roomId, ...data, lastMessageAt: new Date() } },
    { upsert: true }
  );
}

async function saveMessage(msg) {
  const c = await msgs();
  return await c.insertOne({ ...msg, read: false, createdAt: new Date() });
}

async function getMessages(roomId) {
  const c = await msgs();
  return await c.find({ roomId }).sort({ createdAt: 1 }).toArray();
}

async function getConversations(email, org) {
  const c = await convs();
  return await c.find({ participants: email, org }).sort({ lastMessageAt: -1 }).toArray();
}

async function markRead(roomId, readerEmail) {
  const c = await msgs();
  await c.updateMany(
    { roomId, senderEmail: { $ne: readerEmail }, read: false },
    { $set: { read: true } }
  );
}

async function countUnread(email) {
  const c = await msgs();
  return await c.countDocuments({ recipientEmail: email, read: false });
}

module.exports = { upsertConversation, saveMessage, getMessages, getConversations, markRead, countUnread };