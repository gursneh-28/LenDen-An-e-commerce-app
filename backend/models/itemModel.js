const mongoDB = require("../config/db");
const { ObjectId } = require("mongodb");

const collectionName = "items";

async function getCollection() {
  return mongoDB.getCollection(collectionName);
}

async function createItem(itemData) {
  const collection = await getCollection();

  const item = {
    ...itemData,
    name:      itemData.name || "",        // ← NEW
    category:  itemData.category || "other",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return await collection.insertOne(item);
}

async function getAllItems(org) {
  const collection = await getCollection();
  return await collection.find({ org }).sort({ createdAt: -1 }).toArray();
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

async function getItemsByCategory(org, category) {
  const collection = await getCollection();
  return await collection
    .find({ org, category })
    .sort({ createdAt: -1 })
    .toArray();
}

// name added to search — searching by product name now works
async function searchItems(org, searchTerm) {
  const collection = await getCollection();
  return await collection.find({
    org,
    $or: [
      { name:         { $regex: searchTerm, $options: "i" } }, // ← NEW
      { description:  { $regex: searchTerm, $options: "i" } },
      { uploaderName: { $regex: searchTerm, $options: "i" } },
    ],
  }).sort({ createdAt: -1 }).toArray();
}

async function getItemsByUser(userId) {
    const collection = await getCollection();
    return await collection.find({ uploaderId: typeof userId === 'string' ? new ObjectId(userId) : userId })
        .sort({ createdAt: -1 }).toArray();
}

async function getItemsByOrg(orgDomain) {
    const collection = await getCollection();
    return await collection.find({ org: orgDomain }).sort({ createdAt: -1 }).toArray();
}

async function findById(id) {
    const collection = await getCollection();
    return await collection.findOne({ _id: typeof id === 'string' ? new ObjectId(id) : id });
}

async function deleteItem(id) {
    const collection = await getCollection();
    const result = await collection.deleteOne({ _id: typeof id === 'string' ? new ObjectId(id) : id });
    return result.deletedCount > 0;
}

module.exports = {
  createItem,
  getAllItems,
  getItemsByEmail,
  getItemById,
  updateItem,
  deleteItem,
  getItemsByCategory,
  searchItems,
  getItemsByUser,
  getItemsByOrg,
  findById,
  deleteItem
};