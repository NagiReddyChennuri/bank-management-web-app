const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    account_number: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    holder_name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    pin: {
        type: String,
        required: true,
        default: '1234',
        trim: true
    },
    balance: {
        type: Number,
        required: true,
        default: 0.0,
        min: 0.0
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Account', accountSchema);
