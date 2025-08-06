const express = require('express');
const router = express.Router();
const EmailService = require('../services/emailService');
const { logger } = require('../utils/logger');

const emailService = new EmailService();

// POST /api/email/find
router.post('/find', async (req, res) => {
    try {
        const channelData = req.body;
        
        const emailData = await emailService.findChannelEmail(channelData);
        
        res.json({
            success: true,
            data: emailData,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Email finding error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to find email',
            message: error.message
        });
    }
});

module.exports = router;