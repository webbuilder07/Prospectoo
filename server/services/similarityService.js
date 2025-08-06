const { logger } = require('../utils/logger');

class SimilarityService {
    async findSimilarChannels(channelData) {
        try {
            // Mock similar channels for demo
            const channelNames = [
                'Tech Reviews Central', 'Gaming Hub Pro', 'Music Vibes Studio',
                'Cooking Masters', 'Fitness Journey', 'Travel Adventures',
                'DIY Creative', 'Science Explained', 'Art Design Hub', 'Business Insights'
            ];
            
            const baseSubscribers = this.parseSubscriberCount(channelData.subscriberCount) || 100000;
            const similarChannels = [];
            
            for (let i = 0; i < 5; i++) {
                const variation = (Math.random() - 0.5) * 0.6;
                const similarSubs = Math.round(baseSubscribers * (1 + variation));
                const score = Math.round((85 + Math.random() * 10) * 10) / 10;
                
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
        } catch (error) {
            logger.error('Similarity service error:', error);
            throw error;
        }
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

module.exports = SimilarityService;