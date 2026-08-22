const express = require('express');
const cors = require('cors');
const path = require('path');

// 1. Initialize database connection
require('./config/db');

// 2. Import route modules
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

// Mount API Routes
app.use('/api', healthRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);

// Start Server
app.listen(PORT, () => {
    console.log(`==========================================`);
    console.log(` Apex Bank Management Server is running!`);
    console.log(` URL:          http://localhost:${PORT}`);
    console.log(` Accounts:     http://localhost:${PORT}/api/accounts`);
    console.log(` Transactions: http://localhost:${PORT}/api/transactions`);
    console.log(` Analytics:    http://localhost:${PORT}/api/analytics`);
    console.log(`==========================================`);
});