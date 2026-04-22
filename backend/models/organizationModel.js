const mongoDB = require('../config/db');
const { ObjectId } = require('mongodb');

const collectionName = 'organizations';

async function getCollection() {
    return mongoDB.getCollection(collectionName);
}

async function createOrgRequest(data) {
    const collection = await getCollection();
    const newRequest = {
        orgName: data.orgName,
        adminEmail: data.adminEmail,
        adminName: data.adminName,
        contactNumber: data.contactNumber,
        domain: data.domain,
        password: data.password,
        status: data.status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
    };
    const result = await collection.insertOne(newRequest);
    return { ...newRequest, _id: result.insertedId };
}

async function findById(id) {
    const collection = await getCollection();
    return await collection.findOne({ _id: typeof id === 'string' ? new ObjectId(id) : id });
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

async function updateDomain(id, domain) {
    const collection = await getCollection();
    const result = await collection.updateOne(
        { _id: typeof id === 'string' ? new ObjectId(id) : id },
        { $set: { domain, updatedAt: new Date() } }
    );
    return result.modifiedCount > 0;
}

async function getOrganizationWithMembers(orgId) {
    const collection = await getCollection();
    const org = await collection.findOne({ _id: typeof orgId === 'string' ? new ObjectId(orgId) : orgId });
    if (!org) return null;
    
    // Get user count for this organization
    const usersCollection = mongoDB.getCollection('users');
    const memberCount = await usersCollection.countDocuments({ org: org.domain });
    
    return { ...org, memberCount };
}

module.exports = {
    createOrganization,
    findById,
    findByEmail,
    findAll,
    findByStatus,
    updateStatus,
    updateDomain,
    getOrganizationWithMembers
};