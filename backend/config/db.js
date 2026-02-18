const { MongoClient } = require('mongodb');

class MongoDB {
    constructor() {
        this.client = null;
        this.db = null;
    }

    async connect() {
        try {
            const uri = process.env.MONGODB_URI;
            
            if (!uri) {
                throw new Error('MONGODB_URI is not defined in environment variables');
            }

            this.client = new MongoClient(uri, {
                // These options help with connection stability
                connectTimeoutMS: 5000,
                serverSelectionTimeoutMS: 5000
            });

            // Connect to the MongoDB cluster
            await this.client.connect();
            
            // Get reference to the database
            this.db = this.client.db();
            
            console.log('✅ MongoDB connected successfully');
            
            // Test the connection by running a simple command
            await this.db.command({ ping: 1 });
            console.log('✅ Database ping successful');

            return this.db;
        } catch (error) {
            console.error('❌ MongoDB connection error:', error.message);
            throw error;
        }
    }

    // Get database instance
    getDb() {
        if (!this.db) {
            throw new Error('Database not initialized. Call connect() first.');
        }
        return this.db;
    }

    // Close connection (useful for graceful shutdown)
    async close() {
        if (this.client) {
            await this.client.close();
            console.log('🔌 MongoDB connection closed');
        }
    }

    // Helper method to get a collection
    getCollection(collectionName) {
        const db = this.getDb();
        return db.collection(collectionName);
    }
}

// Create a singleton instance
const mongoDB = new MongoDB();

module.exports = mongoDB;