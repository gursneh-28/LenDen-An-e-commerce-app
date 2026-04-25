const mongoDB = require('../config/db');
const bcrypt  = require('bcrypt');

const collectionName = 'superAdmins';

async function getCollection() {
    return mongoDB.getCollection(collectionName);
}

async function initializeSuperAdmins() {
    const collection = await getCollection();

    const emails = (process.env.SUPER_ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);

    if (emails.length === 0) {
        console.warn('⚠️  No SUPER_ADMIN_EMAILS defined in .env — skipping super admin init.');
        return;
    }

    const defaultPassword = process.env.SUPER_ADMIN_DEFAULT_PASSWORD;
    if (!defaultPassword) {
        console.warn('⚠️  No SUPER_ADMIN_DEFAULT_PASSWORD defined in .env — skipping super admin init.');
        return;
    }

    for (const email of emails) {
        const existing = await collection.findOne({ email });
        if (!existing) {
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);
            await collection.insertOne({
                email,
                password:  hashedPassword,
                role:      'super_admin',
                createdAt: new Date(),
            });
            console.log(`✅ Super admin created: ${email}`);
        }
    }
}

async function findByEmail(email) {
    const collection = await getCollection();
    return await collection.findOne({ email });
}

async function createSuperAdmin(email, plainPassword) {
    const collection = await getCollection();
    const existing   = await collection.findOne({ email });
    if (existing) throw new Error('Super admin already exists');

    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const newAdmin = {
        email,
        password:  hashedPassword,
        role:      'super_admin',
        createdAt: new Date(),
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
    deleteSuperAdmin,
};