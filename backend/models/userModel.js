const mongoDB = require('../config/db');
const { ObjectId } = require('mongodb');

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
    return await collection.findOne({
        _id: typeof id === 'string' ? new ObjectId(id) : id
    });
}

async function getWishlist(userId) {
    const collection = await getCollection();
    const user = await collection.findOne(
        { _id: typeof userId === 'string' ? new ObjectId(userId) : userId },
        { projection: { wishlist: 1 } }
    );
    return (user?.wishlist || []).map(id => String(id));
}

async function toggleWishlist(userId, itemId) {
    const collection = await getCollection();
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const user = await collection.findOne({ _id: userObjectId });

    if (!user) throw new Error("User not found");

    const wishlist = (user.wishlist || []).map(id => String(id));
    const strItemId = String(itemId);
    const isWishlisted = wishlist.includes(strItemId);

    if (isWishlisted) {
        await collection.updateOne(
            { _id: userObjectId },
            { $pullAll: { wishlist: [strItemId] } }
        );
        return { action: "removed", wishlist: wishlist.filter(id => id !== strItemId) };
    } else {
        await collection.updateOne(
            { _id: userObjectId },
            { $addToSet: { wishlist: strItemId } }
        );
        return { action: "added", wishlist: [...wishlist, strItemId] };
    }
}

async function getUsersByOrg(orgDomain) {
    const collection = await getCollection();
    return await collection.find({ org: orgDomain }).toArray();
}

async function getUserCountByOrg(orgDomain) {
    const collection = await getCollection();
    return await collection.countDocuments({ org: orgDomain });
}

async function updateUserBlockStatus(userId, isBlocked) {
    const collection = await getCollection();
    const result = await collection.updateOne(
        { _id: typeof userId === 'string' ? new ObjectId(userId) : userId },
        { $set: { isBlocked, updatedAt: new Date() } }
    );
    return result.modifiedCount > 0;
}

async function getAllUsers() {
    const collection = await getCollection();
    return await collection.find({}).toArray();
}

async function updateProfile(userId, fields) {
    const collection = await getCollection();
    await collection.updateOne(
        { _id: typeof userId === 'string' ? new ObjectId(userId) : userId },
        { $set: { ...fields, updatedAt: new Date() } }
    );
}

async function updatePassword(userId, hashedPassword) {
    const collection = await getCollection();
    await collection.updateOne(
        { _id: typeof userId === 'string' ? new ObjectId(userId) : userId },
        { $set: { password: hashedPassword, updatedAt: new Date() } }
    );
}

module.exports = {
    createUser,
    findByEmail,
    findByUsername,
    findById,
    getWishlist,
    toggleWishlist,
    getUsersByOrg,
    getUserCountByOrg,
    updateUserBlockStatus,
    getAllUsers,
    updateProfile,
    updatePassword,
};