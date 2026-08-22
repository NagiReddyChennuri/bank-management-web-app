const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * @route   GET /api/analytics
 * @desc    Get overall bank financial analytics and KPIs
 */
router.get('/', (req, res) => {
    const accountStatsSql = `
    SELECT 
      COUNT(id) AS total_accounts,
      COALESCE(SUM(balance), 0) AS total_liquidity,
      COALESCE(AVG(balance), 0) AS avg_balance
    FROM accounts
  `;

    const transactionStatsSql = `
    SELECT 
      COUNT(id) AS total_transactions,
      COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END), 0) AS total_deposited,
      COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END), 0) AS total_withdrawn
    FROM transactions
  `;

    db.get(accountStatsSql, [], (err, accStats) => {
        if (err) return res.status(500).json({ error: 'Failed to get account analytics', details: err.message });

        db.get(transactionStatsSql, [], (txErr, txStats) => {
            if (txErr) return res.status(500).json({ error: 'Failed to get transaction analytics', details: txErr.message });

            res.json({
                success: true,
                data: {
                    total_accounts: accStats ? accStats.total_accounts : 0,
                    total_liquidity: accStats ? accStats.total_liquidity : 0,
                    avg_balance: accStats ? accStats.avg_balance : 0,
                    total_transactions: txStats ? txStats.total_transactions : 0,
                    total_deposited: txStats ? txStats.total_deposited : 0,
                    total_withdrawn: txStats ? txStats.total_withdrawn : 0,
                    net_flow: (txStats ? txStats.total_deposited : 0) - (txStats ? txStats.total_withdrawn : 0)
                }
            });
        });
    });
});

module.exports = router;