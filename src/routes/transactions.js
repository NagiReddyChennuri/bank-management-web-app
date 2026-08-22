const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * @route   POST /api/transactions/deposit
 */
router.post('/deposit', (req, res) => {
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

    const findSql = 'SELECT id, account_number, balance, pin FROM accounts WHERE account_number = ?';
    db.get(findSql, [account_number], (err, account) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err.message });
        if (!account) return res.status(404).json({ error: 'Account not found.' });

        // 🔒 Strict PIN Check
        const storedPin = String(account.pin || '1234').trim();
        const enteredPin = String(pin).trim();

        if (storedPin !== enteredPin) {
            return res.status(401).json({ error: '❌ Incorrect 4-digit Security PIN. Deposit denied.' });
        }

        const newBalance = account.balance + depositAmount;

        const updateSql = 'UPDATE accounts SET balance = ? WHERE id = ?';
        db.run(updateSql, [newBalance, account.id], function (updateErr) {
            if (updateErr) return res.status(500).json({ error: 'Failed to update balance', details: updateErr.message });

            const txSql = `
        INSERT INTO transactions (account_id, type, amount, description)
        VALUES (?, 'DEPOSIT', ?, ?)
      `;
            const txDesc = description && description.trim() ? description.trim() : 'Funds Deposit';

            db.run(txSql, [account.id, depositAmount, txDesc], function (txErr) {
                if (txErr) console.error('Failed to log deposit transaction:', txErr.message);

                res.json({
                    success: true,
                    message: `✅ PIN Verified! Successfully deposited ₹${depositAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`,
                    data: {
                        account_number: account.account_number,
                        previous_balance: account.balance,
                        new_balance: newBalance
                    }
                });
            });
        });
    });
});

/**
 * @route   POST /api/transactions/withdraw
 */
router.post('/withdraw', (req, res) => {
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

    const findSql = 'SELECT id, account_number, balance, pin FROM accounts WHERE account_number = ?';
    db.get(findSql, [account_number], (err, account) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err.message });
        if (!account) return res.status(404).json({ error: 'Account not found.' });

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

        const newBalance = account.balance - withdrawAmount;

        const updateSql = 'UPDATE accounts SET balance = ? WHERE id = ?';
        db.run(updateSql, [newBalance, account.id], function (updateErr) {
            if (updateErr) return res.status(500).json({ error: 'Failed to update balance', details: updateErr.message });

            const txSql = `
        INSERT INTO transactions (account_id, type, amount, description)
        VALUES (?, 'WITHDRAWAL', ?, ?)
      `;
            const txDesc = description && description.trim() ? description.trim() : 'Funds Withdrawal';

            db.run(txSql, [account.id, withdrawAmount, txDesc], function (txErr) {
                if (txErr) console.error('Failed to log withdrawal transaction:', txErr.message);

                res.json({
                    success: true,
                    message: `✅ PIN Verified! Successfully withdrew ₹${withdrawAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`,
                    data: {
                        account_number: account.account_number,
                        previous_balance: account.balance,
                        new_balance: newBalance
                    }
                });
            });
        });
    });
});

/**
 * @route   GET /api/transactions/:accountNumber
 */
router.get('/:accountNumber', (req, res) => {
    const { accountNumber } = req.params;

    const sql = `
    SELECT t.id, t.type, t.amount, t.description, t.created_at, a.account_number, a.holder_name, a.balance
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE a.account_number = ?
    ORDER BY t.created_at DESC, t.id DESC
  `;

    db.all(sql, [accountNumber], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err.message });

        res.json({
            success: true,
            account_number: accountNumber,
            count: rows.length,
            transactions: rows
        });
    });
});

module.exports = router;