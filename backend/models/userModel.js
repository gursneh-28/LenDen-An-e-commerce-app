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
    // Note: ensure id is an ObjectId if passed as a string
    return await collection.findOne({ _id: typeof id === 'string' ? new ObjectId(id) : id });
}

async function getWishlist(userId) {
    const collection = await getCollection();
    const user = await collection.findOne(
        { _id: typeof userId === 'string' ? new ObjectId(userId) : userId },
        { projection: { wishlist: 1 } }
    );
    return user?.wishlist || [];
}

async function toggleWishlist(userId, itemId) {
    const collection = await getCollection();
    const user = await collection.findOne({ _id: typeof userId === 'string' ? new ObjectId(userId) : userId });
    
    if (!user) throw new Error("User not found");
    
    const wishlist = user.wishlist || [];
    const isWishlisted = wishlist.includes(itemId);
    
    if (isWishlisted) {
        await collection.updateOne(
            { _id: typeof userId === 'string' ? new ObjectId(userId) : userId },
            { $pull: { wishlist: itemId } }
        );
        return { action: "removed", wishlist: wishlist.filter(id => id !== itemId) };
    } else {
        await collection.updateOne(
            { _id: typeof userId === 'string' ? new ObjectId(userId) : userId },
            { $addToSet: { wishlist: itemId } }
        );
        return { action: "added", wishlist: [...wishlist, itemId] };
    }
}

module.exports = {
    createUser,
    findByEmail,
    findByUsername,
    findById,
    getWishlist,
    toggleWishlist
};