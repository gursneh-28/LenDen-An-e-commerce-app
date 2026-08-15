const mongoDB = require('../config/db');

const collectionName = 'otps';

async function getCollection() {
    return mongoDB.getCollection(collectionName);
}

// Call this once on server start to create the TTL index
// MongoDB will automatically delete documents after `expiresAt`
async function createTTLIndex() {
    const collection = await getCollection();
    await collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
    );
}

async function saveOtp(email, otp, expiresInMs = 10 * 60 * 1000) {
    const collection = await getCollection();
    const expiresAt  = new Date(Date.now() + expiresInMs);

    // Upsert — if an OTP already exists for this email, overwrite it
    await collection.updateOne(
        { email },
        { $set: { email, otp, expiresAt } },
        { upsert: true }
    );
}

async function getOtp(email) {
    const collection = await getCollection();
    return await collection.findOne({ email });
}

async function deleteOtp(email) {
    const collection = await getCollection();
    await collection.deleteOne({ email });
}

module.exports = {
    createTTLIndex,
    saveOtp,
    getOtp,
    deleteOtp,
};