// backend/models/userModel.js
const mongoDB = require('../config/db');

class UserModel {
    constructor() {
        this.collectionName = 'users';
    }

    // Get the users collection
    async getCollection() {
        return mongoDB.getCollection(this.collectionName);
    }

    // Create a new user
    async createUser(userData) {
        const collection = await this.getCollection();
        
        // Add timestamps
        const newUser = {
            ...userData,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await collection.insertOne(newUser);
        return result;
    }

    // Find user by email
    async findByEmail(email) {
        const collection = await this.getCollection();
        return await collection.findOne({ email });
    }

    // Find user by username
    async findByUsername(username) {
        const collection = await this.getCollection();
        return await collection.findOne({ username });
    }

    // Find user by ID
    async findById(id) {
        const collection = await this.getCollection();
        return await collection.findOne({ _id: id });
    }
}

module.exports = new UserModel();