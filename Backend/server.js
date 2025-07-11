const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Set up CORS with a dynamic origin that responds with the requesting origin
app.use((req, res, next) => {
    const allowedOrigins = [
        'https://atomjujitsupos.onrender.com',
        'http://localhost:5173'
    ];

    const origin = req.headers.origin;
    console.log(`Request from origin: ${origin}`);

    // If it's a specific route we want to debug
    if (req.path.includes('/users/login')) {
        console.log('Login request detected');
        console.log('Request headers:', req.headers);
    }

    // Either set specific origin or allow all origins with *
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        console.log(`Allowed CORS for origin: ${origin}`);
    } else {
        // For development and troubleshooting, allow any origin
        // Comment this out or remove in final production
        res.setHeader('Access-Control-Allow-Origin', '*');
        console.log(`Using wildcard CORS as origin ${origin} not in allowed list`);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        console.log('Responding to OPTIONS request');
        return res.status(200).end();
    }

    next();
});
app.use(express.json());

// MongoDB Connection with retry logic
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB Atlas');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        // Retry connection after 5 seconds
        setTimeout(connectDB, 5000);
    }
};

mongoose.set('strictQuery', false);
connectDB();

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const purchaseRoutes = require('./routes/purchases');
const categoryRoutes = require('./routes/categories');
const expenseRoutes = require('./routes/Expense');
const userRoutes = require('./routes/User');
const staffRoutes = require('./routes/staff');
const salesRoutes = require('./routes/sales');
const adminRoutes = require('./routes/admin'); // Add admin routes

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/products', productRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/admin', adminRoutes); // Use admin routes

// Basic health check route
app.get('/', (req, res) => {
    const allowedOrigins = [
        'https://atomjujitsupos.onrender.com',
        'http://localhost:5173'
    ];

    res.json({
        status: 'API is running',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        corsAllowedOrigins: allowedOrigins,
        requestOrigin: req.headers.origin || 'Not provided in request'
    });
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.url}`
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    // Close server & exit process
    server.close(() => process.exit(1));
});

module.exports = app; // For testing purposes