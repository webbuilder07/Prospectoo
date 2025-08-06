const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/analyticsService');
const { logger } = require('../utils/logger');

const analyticsService = new AnalyticsService();

// GET /api/analytics/channel/:channelId
router.get('/channel/:channelId', async (req, res) => {
    try {
        const { channelId } = req.params;
        
        logger.info(`Analytics request for channel: ${channelId}`);
        
        const analysisData = await analyticsService.analyzeChannel({
            channelId,
            url: `https://www.youtube.com/channel/${channelId}`
        });
        
        res.json({
            success: true,
            data: analysisData,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Analytics route error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze channel',
            message: error.message
        });
    }
});

// POST /api/analytics/batch
router.post('/batch', async (req, res) => {
    try {
        const { channels } = req.body;
        
        if (!Array.isArray(channels) || channels.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid channels array'
            });
        }
        
        logger.info(`Batch analytics request for ${channels.length} channels`);
        
        const results = await Promise.allSettled(
            channels.map(channel => analyticsService.analyzeChannel(channel))
        );
        
        const successful = results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);
            
        const failed = results
            .filter(r => r.status === 'rejected')
            .map(r => r.reason.message);
        
        res.json({
            success: true,
            data: {
                successful,
                failed,
                totalRequested: channels.length,
                successCount: successful.length,
                failureCount: failed.length
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Batch analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process batch analysis',
            message: error.message
        });
    }
});

module.exports = router;