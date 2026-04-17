const mongoDB = require("../config/db");
const { ObjectId } = require("mongodb");

const col = () => mongoDB.getCollection("orders");

async function createOrder(data) {
  const c = await col();
  return await c.insertOne({ ...data, paymentStatus: "unpaid", createdAt: new Date() });
}

async function getOrdersByBuyer(email) {
  const c = await col();
  return await c.find({ buyerEmail: email }).sort({ createdAt: -1 }).toArray();
}

async function getOrdersBySeller(email) {
  const c = await col();
  return await c.find({ sellerEmail: email }).sort({ createdAt: -1 }).toArray();
}

async function getOrderById(id) {
  const c = await col();
  return await c.findOne({ _id: new ObjectId(id) });
}

async function updateOrderStatus(id, status) {
  const c = await col();
  return await c.updateOne({ _id: new ObjectId(id) }, { $set: { status, updatedAt: new Date() } });
}

async function updateOrderPayment(id, fields) {
  const c = await col();
  return await c.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...fields, updatedAt: new Date() } }
  );
}

module.exports = { createOrder, getOrdersByBuyer, getOrdersBySeller, getOrderById, updateOrderStatus, updateOrderPayment };