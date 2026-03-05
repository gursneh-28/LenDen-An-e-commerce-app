const mongoDB = require('../config/db');

const collectionName = "requests";

async function getCollection() {
    return mongoDB.getCollection(collectionName);
}

async function createRequest(data) {
    const collection = await getCollection();

    const newRequest = {
        ...data,
        createdAt: new Date()
    };

    const result = await collection.insertOne(newRequest);
    return result;
}

async function getAllRequests() {
    const collection = await getCollection();
    return await collection.find().toArray();
}

module.exports = {
    createRequest,
    getAllRequests
};