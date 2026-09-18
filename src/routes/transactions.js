const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

/**
 * @route   POST /api/transactions/deposit
 * @desc    Deposit funds into an account after PIN verification
 */
router.post('/deposit', async (req, res) => {
    try {
        const { account_number, amount, description, pin } = req.body;
        const depositAmount = parseFloat(amount);

        if (!account_number) {
            return res.status(400).json({ error: 'Account number is required.' });
        }

        if (!pin || !pin.toString().trim()) {
            return res.status(400).json({ error: 'Security PIN is required.' });
        }

        if (isNaN(depositAmount) || depositAmount <= 0) {
            return res.status(400).json({ error: 'Deposit amount must be greater than ₹0.' });
        }

        const account = await Account.findOne({ account_number });
        if (!account) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        // 🔒 Strict PIN Check
        const storedPin = String(account.pin || '1234').trim();
        const enteredPin = String(pin).trim();

        if (storedPin !== enteredPin) {
            return res.status(401).json({ error: '❌ Incorrect 4-digit Security PIN. Deposit denied.' });
        }

        const previousBalance = account.balance;
        const newBalance = previousBalance + depositAmount;

        account.balance = newBalance;
        await account.save();

        const txDesc = description && description.trim() ? description.trim() : 'Funds Deposit';
        await Transaction.create({
            account_id: account._id,
            account_number: account.account_number,
            type: 'DEPOSIT',
            amount: depositAmount,
            description: txDesc
        });

        res.json({
            success: true,
            message: `✅ Successfully deposited ₹${depositAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`,
            data: {
                account_number: account.account_number,
                previous_balance: previousBalance,
                new_balance: newBalance
            }
        });
    } catch (err) {
        console.error('Error processing deposit:', err);
        res.status(500).json({ error: 'Failed to process deposit', details: err.message });
    }
});

/**
 * @route   POST /api/transactions/withdraw
 * @desc    Withdraw funds from an account after PIN & balance verification
 */
router.post('/withdraw', async (req, res) => {
    try {
        const { account_number, amount, description, pin } = req.body;
        const withdrawAmount = parseFloat(amount);

        if (!account_number) {
            return res.status(400).json({ error: 'Account number is required.' });
        }

        if (!pin || !pin.toString().trim()) {
            return res.status(400).json({ error: 'Security PIN is required.' });
        }

        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            return res.status(400).json({ error: 'Withdrawal amount must be greater than ₹0.' });
        }

        const account = await Account.findOne({ account_number });
        if (!account) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        // 🔒 Strict PIN Check
        const storedPin = String(account.pin || '1234').trim();
        const enteredPin = String(pin).trim();

        if (storedPin !== enteredPin) {
            return res.status(401).json({ error: '❌ Incorrect 4-digit Security PIN. Withdrawal denied.' });
        }

        if (account.balance < withdrawAmount) {
            return res.status(400).json({
                error: `Insufficient balance. Available: ₹${account.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}, Requested: ₹${withdrawAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            });
        }

        const previousBalance = account.balance;
        const newBalance = previousBalance - withdrawAmount;

        account.balance = newBalance;
        await account.save();

        const txDesc = description && description.trim() ? description.trim() : 'Funds Withdrawal';
        await Transaction.create({
            account_id: account._id,
            account_number: account.account_number,
            type: 'WITHDRAWAL',
            amount: withdrawAmount,
            description: txDesc
        });

        res.json({
            success: true,
            message: `✅ Successfully withdrew ₹${withdrawAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`,
            data: {
                account_number: account.account_number,
                previous_balance: previousBalance,
                new_balance: newBalance
            }
        });
    } catch (err) {
        console.error('Error processing withdrawal:', err);
        res.status(500).json({ error: 'Failed to process withdrawal', details: err.message });
    }
});

/**
 * @route   POST /api/transactions/transfer
 * @desc    Transfer funds between accounts with PIN authorization
 */
router.post('/transfer', async (req, res) => {
    try {
        const { sender_account_number, receiver_account_number, amount, description, pin } = req.body;
        const transferAmount = parseFloat(amount);

        if (!sender_account_number || !receiver_account_number) {
            return res.status(400).json({ error: 'Both sender and recipient account numbers are required.' });
        }

        if (sender_account_number.trim() === receiver_account_number.trim()) {
            return res.status(400).json({ error: 'Cannot transfer funds to the same account.' });
        }

        if (!pin || !pin.toString().trim()) {
            return res.status(400).json({ error: 'Security PIN is required.' });
        }

        if (isNaN(transferAmount) || transferAmount <= 0) {
            return res.status(400).json({ error: 'Transfer amount must be greater than ₹0.' });
        }

        const sender = await Account.findOne({ account_number: sender_account_number.trim() });
        if (!sender) {
            return res.status(404).json({ error: 'Sender account not found.' });
        }

        // Verify PIN
        if (String(sender.pin).trim() !== String(pin).trim()) {
            return res.status(401).json({ error: '❌ Incorrect Security PIN. Transfer denied.' });
        }

        if (sender.balance < transferAmount) {
            return res.status(400).json({
                error: `Insufficient balance. Available: ₹${sender.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}, Requested: ₹${transferAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            });
        }

        const receiver = await Account.findOne({ account_number: receiver_account_number.trim() });
        if (!receiver) {
            return res.status(404).json({ error: `Recipient account ${receiver_account_number} not found. Please verify the account number.` });
        }

        // Perform balance updates
        sender.balance -= transferAmount;
        receiver.balance += transferAmount;

        await sender.save();
        await receiver.save();

        const note = description && description.trim() ? description.trim() : 'Funds Transfer';

        // Sender transaction record
        await Transaction.create({
            account_id: sender._id,
            account_number: sender.account_number,
            type: 'TRANSFER',
            amount: transferAmount,
            description: `Transfer to ${receiver.holder_name} (${receiver.account_number}) - ${note}`
        });

        // Receiver transaction record
        await Transaction.create({
            account_id: receiver._id,
            account_number: receiver.account_number,
            type: 'DEPOSIT',
            amount: transferAmount,
            description: `Transfer from ${sender.holder_name} (${sender.account_number}) - ${note}`
        });

        res.json({
            success: true,
            message: `✅ Successfully transferred ₹${transferAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to ${receiver.holder_name}.`,
            data: {
                sender_account: sender.account_number,
                recipient_name: receiver.holder_name,
                new_balance: sender.balance
            }
        });
    } catch (err) {
        console.error('Error processing transfer:', err);
        res.status(500).json({ error: 'Failed to process transfer', details: err.message });
    }
});

/**
 * @route   GET /api/transactions/:accountNumber
 * @desc    Get transaction history for a specific account
 */
router.get('/:accountNumber', async (req, res) => {
    try {
        const { accountNumber } = req.params;

        const account = await Account.findOne({ account_number: accountNumber });
        if (!account) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        const transactions = await Transaction.find({ account_number: accountNumber })
            .sort({ created_at: -1 });

        res.json({
            success: true,
            account_number: accountNumber,
            count: transactions.length,
            transactions: transactions.map(t => ({
                id: t._id,
                _id: t._id,
                type: t.type,
                amount: t.amount,
                description: t.description,
                created_at: t.created_at,
                account_number: account.account_number,
                holder_name: account.holder_name,
                balance: account.balance
            }))
        });
    } catch (err) {
        console.error('Error fetching transaction history:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

module.exports = router;