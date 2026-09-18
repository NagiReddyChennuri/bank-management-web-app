const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

/**
 * @route   GET /api/analytics
 * @desc    Get overall bank financial analytics and KPIs
 */
router.get('/', async (req, res) => {
    try {
        // 1. Account statistics
        const accountStats = await Account.aggregate([
            {
                $group: {
                    _id: null,
                    total_accounts: { $sum: 1 },
                    total_liquidity: { $sum: '$balance' },
                    avg_balance: { $avg: '$balance' }
                }
            }
        ]);

        const accResult = accountStats[0] || {
            total_accounts: 0,
            total_liquidity: 0,
            avg_balance: 0
        };

        // 2. Transaction statistics
        const transactionStats = await Transaction.aggregate([
            {
                $group: {
                    _id: '$type',
                    total_amount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        let total_transactions = 0;
        let total_deposited = 0;
        let total_withdrawn = 0;

        transactionStats.forEach(stat => {
            total_transactions += stat.count;
            if (stat._id === 'DEPOSIT') {
                total_deposited += stat.total_amount;
            } else if (stat._id === 'WITHDRAWAL') {
                total_withdrawn += stat.total_amount;
            }
        });

        res.json({
            success: true,
            data: {
                total_accounts: accResult.total_accounts,
                total_liquidity: accResult.total_liquidity,
                avg_balance: accResult.avg_balance,
                total_transactions,
                total_deposited,
                total_withdrawn,
                net_flow: total_deposited - total_withdrawn
            }
        });
    } catch (err) {
        console.error('Error calculating analytics:', err);
        res.status(500).json({ error: 'Failed to calculate analytics', details: err.message });
    }
});

module.exports = router;