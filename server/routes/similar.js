const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');

// Simple similarity service (placeholder for ML implementation)
class SimilarityService {
    async findSimilarChannels(channelData) {
        // Mock similar channels for demo
        const channelNames = [
            'Tech Reviews Central', 'Gaming Hub Pro', 'Music Vibes Studio',
            'Cooking Masters', 'Fitness Journey', 'Travel Adventures',
            'DIY Creative', 'Science Explained', 'Art Design Hub', 'Business Insights'
        ];
        
        const baseSubscribers = this.parseSubscriberCount(channelData.subscriberCount) || 100000;
        const similarChannels = [];
        
        for (let i = 0; i < 5; i++) {
            const variation = (Math.random() - 0.5) * 0.6; // ±30% variation
            const similarSubs = Math.round(baseSubscribers * (1 + variation));
            const score = Math.round((85 + Math.random() * 10) * 10) / 10; // 85-95% similarity
            
            similarChannels.push({
                name: channelNames[i],
                subscribers: this.formatNumber(similarSubs),
                avatar: '',
                score: `${score}%`,
                category: channelData.category || 'Entertainment',
                channelId: `UC${Math.random().toString(36).substr(2, 22)}`
            });
        }
        
        return similarChannels;
    }
    
    parseSubscriberCount(subString) {
        if (!subString) return 100000;
        const cleanString = subString.replace(/[^\d.KMB]/gi, '');
        const num = parseFloat(cleanString);
        
        if (cleanString.includes('M')) return Math.round(num * 1000000);
        if (cleanString.includes('K')) return Math.round(num * 1000);
        if (cleanString.includes('B')) return Math.round(num * 1000000000);
        
        return Math.round(num) || 100000;
    }
    
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
}

const similarityService = new SimilarityService();

// POST /api/similar/find
router.post('/find', async (req, res) => {
    try {
        const channelData = req.body;
        
        const similarChannels = await similarityService.findSimilarChannels(channelData);
        
        res.json({
            success: true,
            data: {
                channels: similarChannels,
                algorithm: 'content-based-filtering',
                confidence: 0.85
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Similar channels error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to find similar channels'
        });
    }
});

module.exports = router;