const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Ensure reliable SRV DNS resolution on local Windows / ISP networks (skip in Vercel/Lambda cloud)
if (!process.env.VERCEL) {
    try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (dnsErr) {
        // Fallback to default system DNS
    }
}

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Global cache for Mongoose connection in serverless (Vercel) environments.
 */
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is missing. Please add MONGODB_URI in Vercel Settings -> Environment Variables.');
    }

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