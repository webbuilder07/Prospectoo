const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    // Basic channel information
    channelId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    channelHandle: {
        type: String,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    description: {
        type: String,
        maxLength: 5000
    },
    avatar: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^https?:\/\/.+/.test(v);
            },
            message: 'Avatar must be a valid URL'
        }
    },
    url: {
        type: String,
        required: true
    },
    
    // Channel metrics
    metrics: {
        subscriberCount: {
            type: Number,
            default: 0,
            min: 0
        },
        subscriberGrowth: {
            daily: { type: Number, default: 0 },
            weekly: { type: Number, default: 0 },
            monthly: { type: Number, default: 0 }
        },
        viewCount: {
            type: Number,
            default: 0,
            min: 0
        },
        videoCount: {
            type: Number,
            default: 0,
            min: 0
        },
        averageViews: {
            type: Number,
            default: 0,
            min: 0
        },
        engagementRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        uploadFrequency: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    
    // Audience demographics
    demographics: {
        ageGroups: [{
            range: String, // e.g., "18-24"
            percentage: Number
        }],
        genderSplit: {
            male: { type: Number, default: 50 },
            female: { type: Number, default: 50 },
            other: { type: Number, default: 0 }
        },
        topLocations: [{
            country: String,
            percentage: Number
        }],
        languages: [{
            language: String,
            percentage: Number
        }]
    },
    
    // Content analysis
    content: {
        category: {
            type: String,
            enum: [
                'Gaming', 'Music', 'Technology', 'Entertainment', 'Education',
                'Sports', 'News', 'Comedy', 'Lifestyle', 'Beauty', 'Cooking',
                'Travel', 'Fitness', 'Science', 'Art', 'Business', 'Other'
            ],
            default: 'Other'
        },
        tags: [String],
        topics: [{
            topic: String,
            frequency: Number
        }],
        avgVideoLength: Number, // in seconds
        recentVideos: [{
            videoId: String,
            title: String,
            publishedAt: Date,
            views: Number,
            likes: Number,
            comments: Number,
            duration: Number
        }]
    },
    
    // Contact information
    contact: {
        email: {
            type: String,
            lowercase: true,
            validate: {
                validator: function(v) {
                    return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: 'Invalid email format'
            }
        },
        businessEmail: {
            type: String,
            lowercase: true,
            validate: {
                validator: function(v) {
                    return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: 'Invalid email format'
            }
        },
        socialMedia: {
            twitter: String,
            instagram: String,
            facebook: String,
            tiktok: String,
            website: String
        },
        emailConfidence: {
            type: Number,
            min: 0,
            max: 1,
            default: 0
        },
        emailSource: {
            type: String,
            enum: ['about_page', 'social_media', 'website', 'api', 'manual'],
            default: 'api'
        }
    },
    
    // Channel quality metrics
    quality: {
        fakeFollowerScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        engagementQuality: {
            type: Number,
            min: 0,
            max: 10,
            default: 5
        },
        contentConsistency: {
            type: Number,
            min: 0,
            max: 10,
            default: 5
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        isMonetized: {
            type: Boolean,
            default: false
        },
        isKidsContent: {
            type: Boolean,
            default: false
        }
    },
    
    // Similar channels
    similarChannels: [{
        channelId: String,
        name: String,
        similarity: Number,
        reason: String
    }],
    
    // Analysis metadata
    analysis: {
        lastAnalyzed: {
            type: Date,
            default: Date.now
        },
        analysisCount: {
            type: Number,
            default: 1
        },
        dataFreshness: {
            type: String,
            enum: ['fresh', 'stale', 'outdated'],
            default: 'fresh'
        },
        sources: [{
            source: String,
            lastUpdated: Date,
            confidence: Number
        }]
    },
    
    // Campaign tracking
    campaigns: [{
        campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
        status: {
            type: String,
            enum: ['interested', 'contacted', 'negotiating', 'confirmed', 'completed', 'rejected'],
            default: 'interested'
        },
        notes: String,
        dateAdded: { type: Date, default: Date.now }
    }],
    
    // User who saved this channel
    savedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Tags for organization
    tags: [String],
    
    // Notes
    notes: {
        type: String,
        maxLength: 2000
    },
    
    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived', 'blacklisted'],
        default: 'active'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
channelSchema.index({ name: 'text', description: 'text' });
channelSchema.index({ 'metrics.subscriberCount': -1 });
channelSchema.index({ 'content.category': 1 });
channelSchema.index({ 'analysis.lastAnalyzed': -1 });
channelSchema.index({ createdAt: -1 });
channelSchema.index({ status: 1 });

// Virtual for engagement rate calculation
channelSchema.virtual('engagementRateCalculated').get(function() {
    if (!this.metrics.averageViews || !this.metrics.subscriberCount) return 0;
    return ((this.metrics.averageViews / this.metrics.subscriberCount) * 100).toFixed(2);
});

// Virtual for subscriber tier
channelSchema.virtual('subscriberTier').get(function() {
    const subs = this.metrics.subscriberCount;
    if (subs >= 1000000) return 'mega';
    if (subs >= 100000) return 'macro';
    if (subs >= 10000) return 'mid';
    if (subs >= 1000) return 'micro';
    return 'nano';
});

// Pre-save middleware
channelSchema.pre('save', function(next) {
    // Update data freshness based on last analyzed date
    const daysSinceAnalysis = (Date.now() - this.analysis.lastAnalyzed) / (1000 * 60 * 60 * 24);
    
    if (daysSinceAnalysis < 1) {
        this.analysis.dataFreshness = 'fresh';
    } else if (daysSinceAnalysis < 7) {
        this.analysis.dataFreshness = 'stale';
    } else {
        this.analysis.dataFreshness = 'outdated';
    }
    
    next();
});

// Static methods
channelSchema.statics.findBySubscriberRange = function(min, max) {
    return this.find({
        'metrics.subscriberCount': { $gte: min, $lte: max }
    });
};

channelSchema.statics.findByCategory = function(category) {
    return this.find({ 'content.category': category });
};

channelSchema.statics.findSimilar = function(channelId, limit = 10) {
    return this.aggregate([
        { $match: { channelId: { $ne: channelId } } },
        { $addFields: { 
            similarity: { $rand: {} } // Placeholder - would use ML similarity in production
        }},
        { $sort: { similarity: -1 } },
        { $limit: limit }
    ]);
};

// Instance methods
channelSchema.methods.updateMetrics = function(newMetrics) {
    this.metrics = { ...this.metrics, ...newMetrics };
    this.analysis.lastAnalyzed = new Date();
    this.analysis.analysisCount += 1;
    return this.save();
};

channelSchema.methods.addSimilarChannel = function(similarChannel) {
    const existing = this.similarChannels.find(sc => sc.channelId === similarChannel.channelId);
    if (!existing) {
        this.similarChannels.push(similarChannel);
        return this.save();
    }
    return this;
};

module.exports = mongoose.model('Channel', channelSchema);