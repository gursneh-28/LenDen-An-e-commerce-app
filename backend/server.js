// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const mongoDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/authRoutes');

// Use routes
app.use('/api/auth', authRoutes);

// Connect to MongoDB
async function startServer() {
    try {
        // Connect to database first
        await mongoDB.connect();
        
        // Then start the server
        app.listen(PORT, () => {
            console.log(`✅ Server is running on http://localhost:${PORT}`);
            console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Basic test route
app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 LenDen Backend Server is running!',
        status: 'healthy',
        database: mongoDB.db ? 'connected' : 'disconnected'
    });
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT. Closing MongoDB connection...');
    await mongoDB.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM. Closing MongoDB connection...');
    await mongoDB.close();
    process.exit(0);
});

// Start the server
startServer();