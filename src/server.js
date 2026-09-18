require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// 1. Import route modules
const healthRoutes = require('./routes/api');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Middleware to ensure DB is connected before handling API requests
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('Database connection failed in request middleware:', err.message);
        res.status(503).json({
            error: 'Database connection failed. Please check your MongoDB configuration in .env or Vercel settings.'
        });
    }
});

// Mount API Routes
app.use('/api', healthRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);

// Fallback to index.html for SPA / client routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start Server locally if run directly
if (process.env.NODE_ENV !== 'production' || require.main === module) {
    app.listen(PORT, () => {
        console.log(`==========================================`);
        console.log(` 🚀 Apex Bank Management Server is running!`);
        console.log(` URL:          http://localhost:${PORT}`);
        console.log(` Accounts:     http://localhost:${PORT}/api/accounts`);
        console.log(` Transactions: http://localhost:${PORT}/api/transactions`);
        console.log(` Analytics:    http://localhost:${PORT}/api/analytics`);
        console.log(`==========================================`);
    });
}

module.exports = app;