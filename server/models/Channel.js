const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    // Basic Channel Information
    channelId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        index: true
    },
    handle: {
        type: String,
        index: true
    },
    description: {
        type: String
    },
    avatar: {
        type: String
    },
    url: {
        type: String
    },
    
    // Channel Metrics
    metrics: {
        subscriberCount: Number,
        subscriberGrowth: Number,
        videoCount: Number,
        viewCount: Number,
        avgViews: Number,
        avgViewsGrowth: Number,
        engagementRate: Number,
        engagementTrend: Number,
        uploadFrequency: Number,
        lastUploadDate: Date,
        
        // Video Performance
        recentVideos: [{
            title: String,
            views: Number,
            likes: Number,
            comments: Number,
            duration: String,
            publishedAt: Date
        }],
        
        // Growth Metrics
        monthlyGrowth: {
            subscribers: Number,
            views: Number,
            engagement: Number
        }
    },
    
    // Contact Information
    contact: {
        email: String,
        businessEmail: String,
        emailSource: {
            type: String,
            enum: ['youtube_bio', 'none'],
            default: 'none'
        },
        emailConfidence: {
            type: Number,
            min: 0,
            max: 1,
            default: 0
        },
        website: String,
        socialMedia: [{
            platform: String,
            url: String,
            handle: String
        }]
    },
    
    // Content Analysis
    content: {
        categories: [String],
        tags: [String],
        language: String,
        avgVideoLength: Number,
        uploadSchedule: String,
        contentTypes: [String],
        collaboration: {
            hasCollaborations: Boolean,
            collaborationFrequency: Number,
            commonCollaborators: [String]
        }
    },
    
    // Similar Channels
    similarChannels: [{
        channelId: String,
        name: String,
        handle: String,
        subscriberCount: Number,
        avatar: String,
        similarityScore: Number,
        reason: String,
        category: String
    }],
    
    // Campaign Management
    campaigns: [{
        name: String,
        status: {
            type: String,
            enum: ['planned', 'active', 'completed', 'cancelled'],
            default: 'planned'
        },
        budget: Number,
        startDate: Date,
        endDate: Date,
        goals: [String],
        notes: String,
        performance: {
            reach: Number,
            engagement: Number,
            conversions: Number
        }
    }],
    
    // System Data
    lastAnalyzed: {
        type: Date,
        default: Date.now
    },
    analysisCount: {
        type: Number,
        default: 1
    },
    isActive: {
        type: Boolean,
        default: true
    },
    tags: [String],
    notes: String
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
channelSchema.index({ 'metrics.subscriberCount': -1 });
channelSchema.index({ 'metrics.engagementRate': -1 });
channelSchema.index({ lastAnalyzed: -1 });
channelSchema.index({ 'contact.email': 1 });
channelSchema.index({ tags: 1 });

// Virtual fields
channelSchema.virtual('subscriberCountFormatted').get(function() {
    return this.formatNumber(this.metrics?.subscriberCount);
});

channelSchema.virtual('engagementRateFormatted').get(function() {
    return this.metrics?.engagementRate ? `${this.metrics.engagementRate.toFixed(1)}%` : '0%';
});

channelSchema.virtual('avgViewsFormatted').get(function() {
    return this.formatNumber(this.metrics?.avgViews);
});

// Instance methods
channelSchema.methods.formatNumber = function(num) {
    if (!num) return '0';
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
};

channelSchema.methods.updateMetrics = function(newMetrics) {
    this.metrics = { ...this.metrics, ...newMetrics };
    this.lastAnalyzed = new Date();
    this.analysisCount += 1;
    return this.save();
};

channelSchema.methods.addSimilarChannels = function(channels) {
    // Remove duplicates and add new similar channels
    const existingIds = new Set(this.similarChannels.map(c => c.channelId));
    const newChannels = channels.filter(c => !existingIds.has(c.channelId));
    
    this.similarChannels.push(...newChannels);
    
    // Keep only top 10 similar channels
    this.similarChannels = this.similarChannels
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, 10);
    
    return this.save();
};

channelSchema.methods.addCampaign = function(campaignData) {
    this.campaigns.push(campaignData);
    return this.save();
};

// Static methods
channelSchema.statics.findBySubscriberRange = function(min, max) {
    return this.find({
        'metrics.subscriberCount': { $gte: min, $lte: max }
    });
};

channelSchema.statics.findByEngagementRate = function(minRate) {
    return this.find({
        'metrics.engagementRate': { $gte: minRate }
    });
};

channelSchema.statics.findSimilar = function(channelId, limit = 10) {
    return this.findById(channelId)
        .then(channel => {
            if (!channel) return [];
            
            // Find channels with similar metrics and content
            return this.find({
                _id: { $ne: channelId },
                'content.categories': { $in: channel.content.categories || [] },
                'metrics.subscriberCount': {
                    $gte: channel.metrics.subscriberCount * 0.5,
                    $lte: channel.metrics.subscriberCount * 2
                }
            })
            .limit(limit)
            .sort({ 'metrics.engagementRate': -1 });
        });
};

channelSchema.statics.searchChannels = function(query, filters = {}) {
    const searchQuery = {
        $and: [
            {
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { handle: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    { tags: { $in: [new RegExp(query, 'i')] } }
                ]
            }
        ]
    };

    // Apply filters
    if (filters.minSubscribers) {
        searchQuery.$and.push({ 'metrics.subscriberCount': { $gte: filters.minSubscribers } });
    }
    
    if (filters.maxSubscribers) {
        searchQuery.$and.push({ 'metrics.subscriberCount': { $lte: filters.maxSubscribers } });
    }
    
    if (filters.minEngagement) {
        searchQuery.$and.push({ 'metrics.engagementRate': { $gte: filters.minEngagement } });
    }
    
    if (filters.categories && filters.categories.length > 0) {
        searchQuery.$and.push({ 'content.categories': { $in: filters.categories } });
    }
    
    if (filters.hasEmail) {
        searchQuery.$and.push({ 'contact.email': { $exists: true, $ne: null } });
    }

    return this.find(searchQuery);
};

// Pre-save hooks
channelSchema.pre('save', function(next) {
    // Update last analyzed date if metrics changed
    if (this.isModified('metrics')) {
        this.lastAnalyzed = new Date();
    }
    
    // Ensure analysis count is at least 1
    if (!this.analysisCount || this.analysisCount < 1) {
        this.analysisCount = 1;
    }
    
    next();
});

// Post-save hooks
channelSchema.post('save', function(doc) {
    console.log(`Channel ${doc.name} has been saved/updated`);
});

module.exports = mongoose.model('Channel', channelSchema);