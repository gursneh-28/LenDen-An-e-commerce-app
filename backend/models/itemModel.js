const mongoDB = require("../config/db");
const { ObjectId } = require("mongodb");

const collectionName = "items";

async function getCollection() {
  return mongoDB.getCollection(collectionName);
}

async function createItem(data) {
  const collection = await getCollection();
  const result = await collection.insertOne({ ...data, createdAt: new Date() });
  return result;
}

async function getAllItems(org) {
  return await collection.find({ org: org }).sort({ createdAt: -1 }).toArray();
}

async function getItemsByEmail(email) {
  const collection = await getCollection();
  return await collection.find({ uploadedBy: email }).sort({ createdAt: -1 }).toArray();
}

async function getItemById(id) {
  const collection = await getCollection();
  return await collection.findOne({ _id: new ObjectId(id) });
}

async function updateItem(id, fields) {
  const collection = await getCollection();
  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...fields, updatedAt: new Date() } }
  );
}

async function deleteItem(id) {
  const collection = await getCollection();
  return await collection.deleteOne({ _id: new ObjectId(id) });
}

module.exports = {
  createItem,
  getAllItems,
  getItemsByEmail,
  getItemById,
  updateItem,
  deleteItem,
};