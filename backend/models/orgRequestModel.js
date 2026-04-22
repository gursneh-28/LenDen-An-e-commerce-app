const mongoDB = require('../config/db');
const { ObjectId } = require('mongodb');

const collectionName = 'orgRequests';

async function getCollection() {
    return mongoDB.getCollection(collectionName);
}

async function createOrgRequest(data) {
    const collection = await getCollection();
    const newRequest = {
        ...data,
        status: 'pending', // pending, approved, rejected
        createdAt: new Date(),
        updatedAt: new Date()
    };
    const result = await collection.insertOne(newRequest);
    return { ...newRequest, _id: result.insertedId };
}

async function findById(id) {
    const collection = await getCollection();
    return await collection.findOne({ 
        _id: typeof id === 'string' ? new ObjectId(id) : id 
    });
}

async function findByEmail(email) {
    const collection = await getCollection();
    return await collection.findOne({ adminEmail: email });
}

async function findAll() {
    const collection = await getCollection();
    return await collection.find({}).sort({ createdAt: -1 }).toArray();
}

async function findByStatus(status) {
    const collection = await getCollection();
    return await collection.find({ status }).sort({ createdAt: -1 }).toArray();
}

async function updateStatus(id, status, rejectionReason = null) {
    const collection = await getCollection();
    const updateData = { 
        status, 
        updatedAt: new Date(),
        ...(rejectionReason && { rejectionReason })
    };
    const result = await collection.updateOne(
        { _id: typeof id === 'string' ? new ObjectId(id) : id },
        { $set: updateData }
    );
    return result.modifiedCount > 0;
}

async function getOrgRequestWithDetails(orgId) {
    const collection = await getCollection();
    const orgRequest = await collection.findOne({ 
        _id: typeof orgId === 'string' ? new ObjectId(orgId) : orgId 
    });
    if (!orgRequest) return null;
    
    // Get user count for this organization (after approval)
    const usersCollection = mongoDB.getCollection('users');
    const memberCount = orgRequest.status === 'approved' 
        ? await usersCollection.countDocuments({ org: orgRequest.domain })
        : 0;
    
    return { ...orgRequest, memberCount };
}

async function deleteRequest(id) {
    const collection = await getCollection();
    const result = await collection.deleteOne({ 
        _id: typeof id === 'string' ? new ObjectId(id) : id 
    });
    return result.deletedCount > 0;
}

module.exports = {
    createOrgRequest,
    findById,
    findByEmail,
    findAll,
    findByStatus,
    updateStatus,
    getOrgRequestWithDetails,
    deleteRequest
};