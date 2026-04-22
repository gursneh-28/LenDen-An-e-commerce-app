const mongoDB = require('../config/db');

const collectionName = 'superAdmins';

async function getCollection() {
    return mongoDB.getCollection(collectionName);
}

// Initialize hardcoded super admins
async function initializeSuperAdmins() {
    const collection = await getCollection();
    const superAdmins = [
        { email: 'gursnehkaur1@gmail.com', password: '122333', role: 'super_admin', createdAt: new Date() },
        { email: 'pakhisharma214@gmail.com', password: '122333', role: 'super_admin', createdAt: new Date() },
        { email: 'nagaltanishka@gmail.com', password: '122333', role: 'super_admin', createdAt: new Date() }
    ];
    
    for (const admin of superAdmins) {
        const existing = await collection.findOne({ email: admin.email });
        if (!existing) {
            await collection.insertOne(admin);
        }
    }
}

async function findByEmail(email) {
    const collection = await getCollection();
    return await collection.findOne({ email });
}

async function createSuperAdmin(email, password) {
    const collection = await getCollection();
    const existing = await collection.findOne({ email });
    if (existing) throw new Error('Super admin already exists');
    
    const newAdmin = {
        email,
        password,
        role: 'super_admin',
        createdAt: new Date()
    };
    const result = await collection.insertOne(newAdmin);
    return { ...newAdmin, _id: result.insertedId };
}

async function findAll() {
    const collection = await getCollection();
    return await collection.find({}).toArray();
}

async function deleteSuperAdmin(email) {
    const collection = await getCollection();
    const result = await collection.deleteOne({ email });
    return result.deletedCount > 0;
}

module.exports = {
    initializeSuperAdmins,
    findByEmail,
    createSuperAdmin,
    findAll,
    deleteSuperAdmin
};