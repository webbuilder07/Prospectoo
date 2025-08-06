const Channel = require('../models/Channel');
const { logger } = require('../utils/logger');

class ChannelService {
    async saveChannel(channelData) {
        try {
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
                return await existingChannel.save();
            } else {
                const newChannel = new Channel(channelData);
                return await newChannel.save();
            }
        } catch (error) {
            logger.error('Channel service save error:', error);
            throw error;
        }
    }
}

module.exports = ChannelService;