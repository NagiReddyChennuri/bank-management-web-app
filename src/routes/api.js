const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        message: 'Bank Management API is running smoothly.',
        timestamp: new Date().toISOString()
    });
});

// IMPORTANT: Must export router        
module.exports = router;