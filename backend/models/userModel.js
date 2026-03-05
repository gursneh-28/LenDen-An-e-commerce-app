const mongoDB = require('../config/db');

const collectionName = 'users';

async function getCollection() {
    return mongoDB.getCollection(collectionName);
}

async function createUser(userData) {
    const collection = await getCollection();

    const newUser = {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const result = await collection.insertOne(newUser);
    return result;
}

async function findByEmail(email) {
    const collection = await getCollection();
    return await collection.findOne({ email });
}

async function findByUsername(username) {
    const collection = await getCollection();
    return await collection.findOne({ username });
}

async function findById(id) {
    const collection = await getCollection();
    return await collection.findOne({ _id: id });
}

module.exports = {
    createUser,
    findByEmail,
    findByUsername,
    findById
};