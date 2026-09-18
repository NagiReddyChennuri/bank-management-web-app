const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Ensure reliable SRV DNS resolution on Windows / local ISP networks
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (dnsErr) {
    // If setting custom DNS servers is restricted in certain cloud environments, fallback to default
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI is not defined in environment variables or .env');
}

/**
 * Global cache for Mongoose connection in serverless (Vercel) environments.
 */
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
            console.log('✅ Connected to MongoDB Atlas successfully!');
            return mongooseInstance;
        }).catch((err) => {
            console.error('❌ MongoDB Connection Error:', err.message);
            cached.promise = null;
            throw err;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

module.exports = connectDB;