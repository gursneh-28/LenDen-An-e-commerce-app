const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
}

const client = new MongoClient(uri, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000
});

let db = null;

async function connect() {
    try {
        await client.connect();

        db = client.db(); 

        console.log('MongoDB connected successfully');

        await db.command({ ping: 1 });
        console.log('Database ping successful');

        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        throw error;
    }
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call connect() first.');
    }
    return db;
}

async function close() {
    if (client) {
        await client.close();
        console.log('MongoDB connection closed');
    }
}

function getCollection(collectionName) {
    return getDb().collection(collectionName);
}

module.exports = {
    connect,
    getDb,
    close,
    getCollection
};