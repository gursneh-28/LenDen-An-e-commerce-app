const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Fix for Windows SRV DNS resolution ECONNREFUSED errors

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const mongoDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const requestRoutes = require("./routes/requestRoutes");
const orderRoutes = require('./routes/orderRoutes');

app.use("/api/orders", orderRoutes);
app.use("/api/items", itemRoutes);
app.use('/api/auth', authRoutes);
app.use("/api/requests", requestRoutes);

async function startServer() {
    try {
        await mongoDB.connect();

        app.listen(PORT, '0.0.0.0',() => {
            console.log(`Server is running on http://localhost:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
}

app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 LenDen Backend Server is running!',
        status: 'working',
        database: mongoDB.db ? 'connected' : 'disconnected'
    });
});

// Ctrl + C
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Closing MongoDB connection...');
    await mongoDB.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Closing MongoDB connection...');
    await mongoDB.close();
    process.exit(0);
});

startServer();