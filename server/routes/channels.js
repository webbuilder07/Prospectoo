const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const { logger } = require('../utils/logger');

// GET /api/channels - Get all saved channels
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, category, sort = '-createdAt' } = req.query;
        
        const query = {};
        if (category) query['content.category'] = category;
        
        const channels = await Channel.find(query)
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
            
        const total = await Channel.countDocuments(query);
        
        res.json({
            success: true,
            data: {
                channels,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            }
        });
        
    } catch (error) {
        logger.error('Get channels error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch channels'
        });
    }
});

// POST /api/channels - Save a new channel
router.post('/', async (req, res) => {
    try {
        const channelData = req.body;
        
        const existingChannel = await Channel.findOne({
            $or: [
                { channelId: channelData.channelInfo?.channelId },
                { name: channelData.channelInfo?.name }
            ]
        });

        if (existingChannel) {
            Object.assign(existingChannel, channelData);
            existingChannel.analysis.lastAnalyzed = new Date();
            existingChannel.analysis.analysisCount += 1;
            await existingChannel.save();
            
            res.json({
                success: true,
                data: existingChannel,
                message: 'Channel updated successfully'
            });
        } else {
            const newChannel = new Channel(channelData);
            await newChannel.save();
            
            res.json({
                success: true,
                data: newChannel,
                message: 'Channel saved successfully'
            });
        }
        
    } catch (error) {
        logger.error('Save channel error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save channel'
        });
    }
});

module.exports = router;