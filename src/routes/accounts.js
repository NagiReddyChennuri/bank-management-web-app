const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

// Helper function: Generate a unique account number
function generateAccountNumber() {
    return 'ACC-' + Math.floor(1000000000 + Math.random() * 9000000000);
}

/**
 * @route   POST /api/accounts/login
 * @desc    Log in customer using Account Number or Email + 4-digit PIN
 */
router.post('/login', async (req, res) => {
    try {
        const { identifier, pin } = req.body;

        if (!identifier || !identifier.trim()) {
            return res.status(400).json({ error: 'Please enter your Account Number or Email.' });
        }

        if (!pin || !pin.toString().trim()) {
            return res.status(400).json({ error: 'Please enter your 4-digit Security PIN.' });
        }

        const cleanIdentifier = identifier.trim();
        const cleanPin = String(pin).trim();

        // Find by account number or email
        const account = await Account.findOne({
            $or: [
                { account_number: cleanIdentifier },
                { email: cleanIdentifier.toLowerCase() }
            ]
        });

        if (!account) {
            return res.status(404).json({ error: 'No account found with this Account Number or Email.' });
        }

        if (String(account.pin).trim() !== cleanPin) {
            return res.status(401).json({ error: '❌ Incorrect 4-digit Security PIN. Access denied.' });
        }

        res.json({
            success: true,
            message: `Welcome back, ${account.holder_name}!`,
            data: {
                id: account._id,
                _id: account._id,
                account_number: account.account_number,
                holder_name: account.holder_name,
                email: account.email,
                balance: account.balance,
                created_at: account.created_at
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed', details: err.message });
    }
});

/**
 * @route   GET /api/accounts/me/:accountNumber
 * @desc    Get details for a single logged-in account
 */
router.get('/me/:accountNumber', async (req, res) => {
    try {
        const { accountNumber } = req.params;

        const account = await Account.findOne({ account_number: accountNumber });
        if (!account) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        res.json({
            success: true,
            data: {
                id: account._id,
                _id: account._id,
                account_number: account.account_number,
                holder_name: account.holder_name,
                email: account.email,
                balance: account.balance,
                created_at: account.created_at
            }
        });
    } catch (err) {
        console.error('Error fetching account details:', err);
        res.status(500).json({ error: 'Failed to retrieve account details', details: err.message });
    }
});

/**
 * @route   POST /api/accounts
 * @desc    Create a new bank account with user PIN
 */
router.post('/', async (req, res) => {
    try {
        const { holder_name, email, initial_deposit, pin } = req.body;

        if (!holder_name || !holder_name.trim()) {
            return res.status(400).json({ error: 'Account holder name is required.' });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({ error: 'Email address is required.' });
        }

        const cleanPin = pin ? String(pin).trim() : '';
        if (!/^\d{4}$/.test(cleanPin)) {
            return res.status(400).json({ error: 'Please choose a 4-digit Security PIN (e.g. 1234).' });
        }

        const depositAmount = parseFloat(initial_deposit) || 0.0;
        if (depositAmount < 0) {
            return res.status(400).json({ error: 'Initial deposit cannot be negative.' });
        }

        const cleanEmail = email.trim().toLowerCase();

        // Check if email is already registered
        const existingAccount = await Account.findOne({ email: cleanEmail });
        if (existingAccount) {
            return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
        }

        // Generate unique account number
        let accountNumber;
        let isUnique = false;
        while (!isUnique) {
            accountNumber = generateAccountNumber();
            const exists = await Account.findOne({ account_number: accountNumber });
            if (!exists) isUnique = true;
        }

        // Create Account
        const newAccount = new Account({
            account_number: accountNumber,
            holder_name: holder_name.trim(),
            email: cleanEmail,
            pin: cleanPin,
            balance: depositAmount
        });

        const savedAccount = await newAccount.save();

        // If initial deposit > 0, create transaction
        if (depositAmount > 0) {
            await Transaction.create({
                account_id: savedAccount._id,
                account_number: savedAccount.account_number,
                type: 'DEPOSIT',
                amount: depositAmount,
                description: 'Initial Account Opening Deposit'
            });
        }

        res.status(201).json({
            success: true,
            message: `Account opened successfully! Your Account Number is ${accountNumber}`,
            data: {
                id: savedAccount._id,
                _id: savedAccount._id,
                account_number: savedAccount.account_number,
                holder_name: savedAccount.holder_name,
                email: savedAccount.email,
                balance: savedAccount.balance,
                created_at: savedAccount.created_at
            }
        });
    } catch (err) {
        console.error('Error creating account:', err);
        if (err.code === 11000) {
            return res.status(400).json({ error: 'An account with this email or account number already exists.' });
        }
        res.status(500).json({ error: 'Failed to create account', details: err.message });
    }
});

/**
 * @route   PUT /api/accounts/:accountNumber
 * @desc    Update account details & PIN with mandatory Current PIN verification
 */
router.put('/:accountNumber', async (req, res) => {
    try {
        const { accountNumber } = req.params;
        const { holder_name, email, current_pin, new_pin } = req.body;

        if (!holder_name || !holder_name.trim()) {
            return res.status(400).json({ error: 'Holder name cannot be empty.' });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({ error: 'Email address cannot be empty.' });
        }

        if (!current_pin || !current_pin.toString().trim()) {
            return res.status(400).json({ error: 'Current 4-digit Security PIN is required to authorize changes.' });
        }

        const account = await Account.findOne({ account_number: accountNumber });
        if (!account) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        // 🔒 Verify Current PIN
        const storedPin = String(account.pin || '1234').trim();
        const enteredCurrentPin = String(current_pin).trim();

        if (storedPin !== enteredCurrentPin) {
            return res.status(401).json({ error: '❌ Incorrect Current Security PIN. Changes denied.' });
        }

        // Determine if PIN is being updated
        let targetPin = storedPin;
        if (new_pin && String(new_pin).trim()) {
            const cleanNewPin = String(new_pin).trim();
            if (!/^\d{4}$/.test(cleanNewPin)) {
                return res.status(400).json({ error: 'New PIN must be exactly 4 numeric digits.' });
            }
            targetPin = cleanNewPin;
        }

        const cleanEmail = email.trim().toLowerCase();

        // Check if updating email conflicts with another account
        if (cleanEmail !== account.email) {
            const emailInUse = await Account.findOne({ email: cleanEmail, _id: { $ne: account._id } });
            if (emailInUse) {
                return res.status(400).json({ error: 'This email is already in use by another account.' });
            }
        }

        account.holder_name = holder_name.trim();
        account.email = cleanEmail;
        account.pin = targetPin;

        await account.save();

        res.json({
            success: true,
            message: '✅ Profile & PIN updated successfully.',
            data: {
                id: account._id,
                _id: account._id,
                account_number: account.account_number,
                holder_name: account.holder_name,
                email: account.email,
                balance: account.balance
            }
        });
    } catch (err) {
        console.error('Error updating account:', err);
        res.status(500).json({ error: 'Failed to update account', details: err.message });
    }
});

/**
 * @route   DELETE /api/accounts/:accountNumber
 * @desc    Delete/Close an account and remove its transactions
 */
router.delete('/:accountNumber', async (req, res) => {
    try {
        const { accountNumber } = req.params;
        const { pin } = req.body;

        const account = await Account.findOne({ account_number: accountNumber });
        if (!account) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        if (pin && String(account.pin).trim() !== String(pin).trim()) {
            return res.status(401).json({ error: '❌ Incorrect Security PIN. Cannot close account.' });
        }

        await Account.findOneAndDelete({ account_number: accountNumber });
        await Transaction.deleteMany({ account_number: accountNumber });

        res.json({
            success: true,
            message: `Account ${accountNumber} (${account.holder_name}) closed successfully.`
        });
    } catch (err) {
        console.error('Error deleting account:', err);
        res.status(500).json({ error: 'Failed to close account', details: err.message });
    }
});

/**
 * @route   POST /api/accounts/clear-all-data
 * @desc    Utility endpoint to wipe test accounts and transactions
 */
router.post('/clear-all-data', async (req, res) => {
    try {
        await Account.deleteMany({});
        await Transaction.deleteMany({});
        res.json({
            success: true,
            message: 'All accounts and transactions have been successfully cleared.'
        });
    } catch (err) {
        console.error('Error clearing data:', err);
        res.status(500).json({ error: 'Failed to clear data', details: err.message });
    }
});

module.exports = router;