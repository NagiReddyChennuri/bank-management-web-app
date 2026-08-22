const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Helper function: Generate a unique account number
function generateAccountNumber() {
    return 'ACC-' + Math.floor(1000000000 + Math.random() * 9000000000);
}

/**
 * @route   GET /api/accounts
 * @desc    Get all bank accounts
 */
router.get('/', (req, res) => {
    const searchQuery = req.query.q ? `%${req.query.q.trim()}%` : null;

    let sql = 'SELECT id, account_number, holder_name, email, balance, created_at FROM accounts';
    let params = [];

    if (searchQuery) {
        sql += ' WHERE account_number LIKE ? OR holder_name LIKE ? OR email LIKE ?';
        params = [searchQuery, searchQuery, searchQuery];
    }

    sql += ' ORDER BY id DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to retrieve accounts', details: err.message });
        res.json({ success: true, count: rows.length, data: rows });
    });
});

/**
 * @route   POST /api/accounts
 * @desc    Create a new bank account with user PIN
 */
router.post('/', (req, res) => {
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

    const accountNumber = generateAccountNumber();
    const sql = `
    INSERT INTO accounts (account_number, holder_name, email, pin, balance)
    VALUES (?, ?, ?, ?, ?)
  `;

    db.run(sql, [accountNumber, holder_name.trim(), email.trim().toLowerCase(), cleanPin, depositAmount], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'An account with this email already exists.' });
            }
            return res.status(500).json({ error: 'Failed to create account', details: err.message });
        }

        const newAccountId = this.lastID;

        if (depositAmount > 0) {
            const txSql = `INSERT INTO transactions (account_id, type, amount, description) VALUES (?, 'DEPOSIT', ?, 'Initial Account Opening Deposit')`;
            db.run(txSql, [newAccountId, depositAmount]);
        }

        res.status(201).json({
            success: true,
            message: `Account created successfully with your chosen PIN!`,
            data: {
                id: newAccountId,
                account_number: accountNumber,
                holder_name: holder_name.trim(),
                email: email.trim().toLowerCase(),
                balance: depositAmount
            }
        });
    });
});

/**
 * @route   PUT /api/accounts/:accountNumber
 * @desc    Update account details & PIN with mandatory Old PIN verification
 */
router.put('/:accountNumber', (req, res) => {
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

    // 1. Fetch current account to verify old PIN
    db.get('SELECT id, pin FROM accounts WHERE account_number = ?', [accountNumber], (findErr, account) => {
        if (findErr) return res.status(500).json({ error: 'Database error', details: findErr.message });
        if (!account) return res.status(404).json({ error: 'Account not found.' });

        // 🔒 2. Verify Old PIN
        const storedPin = String(account.pin || '1234').trim();
        const enteredCurrentPin = String(current_pin).trim();

        if (storedPin !== enteredCurrentPin) {
            return res.status(401).json({ error: '❌ Incorrect Current Security PIN. Changes denied.' });
        }

        // 3. Determine if PIN is being updated
        let targetPin = storedPin;
        if (new_pin && String(new_pin).trim()) {
            const cleanNewPin = String(new_pin).trim();
            if (!/^\d{4}$/.test(cleanNewPin)) {
                return res.status(400).json({ error: 'New PIN must be exactly 4 numeric digits.' });
            }
            targetPin = cleanNewPin;
        }

        // 4. Update the account
        const updateSql = `
      UPDATE accounts 
      SET holder_name = ?, email = ?, pin = ?
      WHERE account_number = ?
    `;

        db.run(updateSql, [holder_name.trim(), email.trim().toLowerCase(), targetPin, accountNumber], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'This email is already in use by another account.' });
                }
                return res.status(500).json({ error: 'Failed to update account', details: err.message });
            }

            res.json({
                success: true,
                message: new_pin ? '✅ Account details and Security PIN updated successfully!' : '✅ Account details updated successfully!'
            });
        });
    });
});

/**
 * @route   DELETE /api/accounts/:accountNumber
 * @desc    Close / Delete bank account
 */
router.delete('/:accountNumber', (req, res) => {
    const { accountNumber } = req.params;

    db.get('SELECT id FROM accounts WHERE account_number = ?', [accountNumber], (err, account) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err.message });
        if (!account) return res.status(404).json({ error: 'Account not found.' });

        db.run('DELETE FROM transactions WHERE account_id = ?', [account.id], () => {
            db.run('DELETE FROM accounts WHERE id = ?', [account.id], function (delErr) {
                if (delErr) return res.status(500).json({ error: 'Failed to delete account', details: delErr.message });

                res.json({
                    success: true,
                    message: `Account ${accountNumber} has been closed successfully.`
                });
            });
        });
    });
});

module.exports = router;