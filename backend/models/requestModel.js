const mongoDB = require("../config/db");
const { ObjectId } = require("mongodb");

const collectionName = "requests";

async function getCollection() {
  return mongoDB.getCollection(collectionName);
}

async function createRequest(data) {
  const collection = await getCollection();
  const result = await collection.insertOne({ ...data, createdAt: new Date() });
  return result;
}

async function getAllRequests(org) {
  return await collection.find({ org: org }).sort({ createdAt: -1 }).toArray();
}

async function getRequestsByEmail(email) {
  const collection = await getCollection();
  return await collection.find({ requestedBy: email }).sort({ createdAt: -1 }).toArray();
}

async function getRequestById(id) {
  const collection = await getCollection();
  return await collection.findOne({ _id: new ObjectId(id) });
}

async function updateRequest(id, fields) {
  const collection = await getCollection();
  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...fields, updatedAt: new Date() } }
  );
}

async function deleteRequest(id) {
  const collection = await getCollection();
  return await collection.deleteOne({ _id: new ObjectId(id) });
}

module.exports = {
  createRequest,
  getAllRequests,
  getRequestsByEmail,
  getRequestById,
  updateRequest,
  deleteRequest,
};