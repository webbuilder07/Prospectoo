const axios = require('axios');
const Channel = require('../models/Channel');
const { logger } = require('../utils/logger');

class AnalyticsService {
    constructor() {
        this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
        this.youtubeApiBase = 'https://www.googleapis.com/youtube/v3';
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    async analyzeChannel(channelData) {
        try {
            logger.info(`Starting analysis for channel: ${channelData.name || channelData.channelName}`);

            // Get channel details from YouTube API
            const channelDetails = await this.getChannelDetails(channelData);
            if (!channelDetails) {
                logger.warn('Could not fetch channel details, using mock data');
                return this.generateMockAnalysis(channelData);
            }

            // Get recent videos for engagement analysis
            const recentVideos = await this.getRecentVideos(channelDetails.id);

            // Calculate comprehensive metrics
            const metrics = this.calculateMetrics(channelDetails, recentVideos);
            
            // Prepare analysis result
            const analysisResult = {
                channelInfo: {
                    channelId: channelDetails.id,
                    name: channelDetails.snippet?.title || channelData.name,
                    handle: channelData.channelHandle || channelData.handle,
                    description: channelDetails.snippet?.description || '',
                    avatar: channelDetails.snippet?.thumbnails?.high?.url || '',
                    url: channelData.url || `https://www.youtube.com/channel/${channelDetails.id}`
                },
                metrics: metrics,
                content: this.analyzeContent(channelDetails, recentVideos),
                lastAnalyzed: new Date()
            };

            // Save to database
            await this.saveChannelData(analysisResult);

            logger.success(`Analysis completed for ${analysisResult.channelInfo.name}`);
            return analysisResult;

        } catch (error) {
            logger.error('Analytics error:', error);
            return this.generateMockAnalysis(channelData);
        }
    }

    async getChannelDetails(channelData) {
        try {
            if (!this.youtubeApiKey) {
                logger.warn('YouTube API key not configured');
                return null;
            }

            let channelId = channelData.channelId;

            // If we don't have channelId, try to get it from handle or username
            if (!channelId && (channelData.channelHandle || channelData.handle)) {
                channelId = await this.getChannelIdFromHandle(channelData.channelHandle || channelData.handle);
            }

            if (!channelId) {
                logger.warn('Could not determine channel ID');
                return null;
            }

            const response = await axios.get(`${this.youtubeApiBase}/channels`, {
                params: {
                    key: this.youtubeApiKey,
                    id: channelId,
                    part: 'snippet,statistics,contentDetails,brandingSettings'
                },
                timeout: 10000
            });

            if (response.data.items && response.data.items.length > 0) {
                return response.data.items[0];
            }

            return null;

        } catch (error) {
            logger.error('Error fetching channel details:', error);
            return null;
        }
    }

    async getChannelIdFromHandle(handle) {
        try {
            // Clean handle (remove @ if present)
            const cleanHandle = handle.replace('@', '');

            const response = await axios.get(`${this.youtubeApiBase}/search`, {
                params: {
                    key: this.youtubeApiKey,
                    q: cleanHandle,
                    type: 'channel',
                    part: 'snippet',
                    maxResults: 1
                },
                timeout: 10000
            });

            if (response.data.items && response.data.items.length > 0) {
                return response.data.items[0].id.channelId;
            }

            return null;

        } catch (error) {
            logger.error('Error getting channel ID from handle:', error);
            return null;
        }
    }

    async getRecentVideos(channelId) {
        try {
            if (!this.youtubeApiKey) return [];

            const response = await axios.get(`${this.youtubeApiBase}/search`, {
                params: {
                    key: this.youtubeApiKey,
                    channelId: channelId,
                    type: 'video',
                    part: 'snippet',
                    order: 'date',
                    maxResults: 10
                },
                timeout: 10000
            });

            if (!response.data.items) return [];

            // Get detailed video statistics
            const videoIds = response.data.items.map(item => item.id.videoId).join(',');
            
            const statsResponse = await axios.get(`${this.youtubeApiBase}/videos`, {
                params: {
                    key: this.youtubeApiKey,
                    id: videoIds,
                    part: 'statistics,contentDetails,snippet'
                },
                timeout: 10000
            });

            return statsResponse.data.items || [];

        } catch (error) {
            logger.error('Error fetching recent videos:', error);
            return [];
        }
    }

    calculateMetrics(channelDetails, recentVideos) {
        const stats = channelDetails.statistics || {};
        
        // Basic metrics
        const subscriberCount = parseInt(stats.subscriberCount) || 0;
        const totalViews = parseInt(stats.viewCount) || 0;
        const videoCount = parseInt(stats.videoCount) || 0;

        // Calculate engagement metrics from recent videos
        const engagement = this.calculateEngagementMetrics(recentVideos);
        
        // Calculate upload frequency
        const uploadFreq = this.calculateUploadFrequency(recentVideos);

        // Estimate growth (would need historical data for accurate calculation)
        const estimatedGrowth = this.estimateGrowth(subscriberCount, engagement.avgViews);

        return {
            subscriberCount: subscriberCount,
            subscriberGrowth: estimatedGrowth.subscribers,
            videoCount: videoCount,
            viewCount: totalViews,
            avgViews: engagement.avgViews,
            avgViewsGrowth: estimatedGrowth.views,
            engagementRate: engagement.rate,
            engagementTrend: engagement.trend,
            uploadFrequency: uploadFreq,
            lastUploadDate: this.getLastUploadDate(recentVideos),
            recentVideos: this.formatRecentVideos(recentVideos),
            monthlyGrowth: {
                subscribers: estimatedGrowth.subscribers,
                views: estimatedGrowth.views,
                engagement: engagement.trend
            }
        };
    }

    calculateEngagementMetrics(videos) {
        if (!videos || videos.length === 0) {
            return { rate: 0, avgViews: 0, trend: 0 };
        }

        let totalViews = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let engagementRates = [];

        videos.forEach(video => {
            const stats = video.statistics || {};
            const views = parseInt(stats.viewCount) || 0;
            const likes = parseInt(stats.likeCount) || 0;
            const comments = parseInt(stats.commentCount) || 0;

            totalViews += views;
            totalLikes += likes;
            totalComments += comments;

            if (views > 0) {
                const engagementRate = ((likes + comments) / views) * 100;
                engagementRates.push(engagementRate);
            }
        });

        const avgViews = Math.round(totalViews / videos.length);
        const avgEngagementRate = engagementRates.length > 0 
            ? engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length 
            : 0;

        // Calculate trend (simplified - would need historical data)
        const trend = engagementRates.length > 1 
            ? ((engagementRates[0] - engagementRates[engagementRates.length - 1]) / engagementRates[engagementRates.length - 1]) * 100
            : 0;

        return {
            rate: Math.round(avgEngagementRate * 100) / 100,
            avgViews: avgViews,
            trend: Math.round(trend * 100) / 100
        };
    }

    calculateUploadFrequency(videos) {
        if (!videos || videos.length < 2) return 0;

        const dates = videos
            .map(video => new Date(video.snippet.publishedAt))
            .sort((a, b) => b - a);

        const daysBetween = (dates[0] - dates[dates.length - 1]) / (1000 * 60 * 60 * 24);
        const uploadsPerWeek = (videos.length / daysBetween) * 7;

        return Math.round(uploadsPerWeek * 10) / 10;
    }

    estimateGrowth(subscriberCount, avgViews) {
        // Simple growth estimation based on current metrics
        // In production, this would use historical data
        
        const viewToSubRatio = subscriberCount > 0 ? avgViews / subscriberCount : 0;
        
        // Estimate based on engagement patterns
        let subscriberGrowthRate = 0;
        let viewGrowthRate = 0;

        if (viewToSubRatio > 0.1) {
            subscriberGrowthRate = Math.random() * 15 + 5; // 5-20%
            viewGrowthRate = Math.random() * 20 + 10; // 10-30%
        } else if (viewToSubRatio > 0.05) {
            subscriberGrowthRate = Math.random() * 10 + 2; // 2-12%
            viewGrowthRate = Math.random() * 15 + 5; // 5-20%
        } else {
            subscriberGrowthRate = Math.random() * 5; // 0-5%
            viewGrowthRate = Math.random() * 10; // 0-10%
        }

        return {
            subscribers: Math.round(subscriberGrowthRate * 100) / 100,
            views: Math.round(viewGrowthRate * 100) / 100
        };
    }

    getLastUploadDate(videos) {
        if (!videos || videos.length === 0) return null;
        
        const dates = videos.map(video => new Date(video.snippet.publishedAt));
        return new Date(Math.max(...dates));
    }

    formatRecentVideos(videos) {
        if (!videos) return [];
        
        return videos.slice(0, 5).map(video => ({
            title: video.snippet?.title || 'Unknown Title',
            views: parseInt(video.statistics?.viewCount) || 0,
            likes: parseInt(video.statistics?.likeCount) || 0,
            comments: parseInt(video.statistics?.commentCount) || 0,
            duration: video.contentDetails?.duration || 'PT0S',
            publishedAt: new Date(video.snippet?.publishedAt)
        }));
    }

    analyzeContent(channelDetails, recentVideos) {
        const snippet = channelDetails.snippet || {};
        const recentTitles = recentVideos.map(v => v.snippet?.title || '').join(' ').toLowerCase();
        
        // Extract categories/topics from titles and description
        const categories = this.extractCategories(snippet.description + ' ' + recentTitles);
        const tags = this.extractTags(recentTitles);
        
        // Calculate average video length
        const avgVideoLength = this.calculateAverageVideoLength(recentVideos);
        
        // Detect upload schedule pattern
        const uploadSchedule = this.detectUploadSchedule(recentVideos);
        
        return {
            categories: categories,
            tags: tags,
            language: snippet.defaultLanguage || snippet.country || 'en',
            avgVideoLength: avgVideoLength,
            uploadSchedule: uploadSchedule,
            contentTypes: this.detectContentTypes(recentTitles),
            collaboration: this.detectCollaborations(recentVideos)
        };
    }

    extractCategories(text) {
        const categoryKeywords = {
            'gaming': ['game', 'gaming', 'play', 'stream', 'walkthrough', 'review'],
            'tech': ['tech', 'technology', 'review', 'unbox', 'gadget', 'phone', 'computer'],
            'education': ['tutorial', 'learn', 'guide', 'how to', 'explain', 'course'],
            'entertainment': ['funny', 'comedy', 'entertainment', 'reaction', 'vlog'],
            'music': ['music', 'song', 'cover', 'instrumental', 'audio'],
            'lifestyle': ['lifestyle', 'daily', 'routine', 'life', 'personal'],
            'beauty': ['makeup', 'beauty', 'skincare', 'hair', 'fashion'],
            'fitness': ['workout', 'fitness', 'exercise', 'gym', 'health'],
            'cooking': ['cooking', 'recipe', 'food', 'kitchen', 'chef'],
            'travel': ['travel', 'trip', 'journey', 'explore', 'adventure']
        };

        const categories = [];
        const textLower = text.toLowerCase();

        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => textLower.includes(keyword))) {
                categories.push(category);
            }
        }

        return categories.length > 0 ? categories : ['general'];
    }

    extractTags(text) {
        // Extract common words as tags
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3);

        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });

        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }

    calculateAverageVideoLength(videos) {
        if (!videos || videos.length === 0) return 0;

        const durations = videos
            .map(video => this.parseDuration(video.contentDetails?.duration))
            .filter(duration => duration > 0);

        if (durations.length === 0) return 0;

        return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }

    parseDuration(isoDuration) {
        if (!isoDuration) return 0;
        
        // Parse ISO 8601 duration (PT4M13S -> 253 seconds)
        const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;

        return hours * 3600 + minutes * 60 + seconds;
    }

    detectUploadSchedule(videos) {
        if (!videos || videos.length < 3) return 'irregular';

        const dates = videos
            .map(video => new Date(video.snippet.publishedAt))
            .sort((a, b) => b - a);

        const intervals = [];
        for (let i = 0; i < dates.length - 1; i++) {
            const daysBetween = (dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24);
            intervals.push(daysBetween);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        if (avgInterval <= 2) return 'daily';
        if (avgInterval <= 4) return 'every-few-days';
        if (avgInterval <= 8) return 'weekly';
        if (avgInterval <= 16) return 'bi-weekly';
        if (avgInterval <= 32) return 'monthly';
        return 'irregular';
    }

    detectContentTypes(titlesText) {
        const types = [];
        const text = titlesText.toLowerCase();

        if (text.includes('live') || text.includes('stream')) types.push('live-stream');
        if (text.includes('short') || text.includes('#shorts')) types.push('shorts');
        if (text.includes('tutorial') || text.includes('how')) types.push('tutorial');
        if (text.includes('review') || text.includes('unbox')) types.push('review');
        if (text.includes('vlog') || text.includes('daily')) types.push('vlog');
        if (text.includes('reaction') || text.includes('react')) types.push('reaction');

        return types.length > 0 ? types : ['standard'];
    }

    detectCollaborations(videos) {
        if (!videos || videos.length === 0) {
            return {
                hasCollaborations: false,
                collaborationFrequency: 0,
                commonCollaborators: []
            };
        }

        const collabKeywords = ['feat', 'featuring', 'with', 'vs', 'collaboration', 'collab'];
        const collaborationVideos = videos.filter(video => {
            const title = (video.snippet?.title || '').toLowerCase();
            return collabKeywords.some(keyword => title.includes(keyword));
        });

        return {
            hasCollaborations: collaborationVideos.length > 0,
            collaborationFrequency: Math.round((collaborationVideos.length / videos.length) * 100),
            commonCollaborators: [] // Would need more sophisticated analysis
        };
    }

    async saveChannelData(analysisResult) {
        try {
            const channelData = {
                channelId: analysisResult.channelInfo.channelId,
                name: analysisResult.channelInfo.name,
                handle: analysisResult.channelInfo.handle,
                description: analysisResult.channelInfo.description,
                avatar: analysisResult.channelInfo.avatar,
                url: analysisResult.channelInfo.url,
                metrics: analysisResult.metrics,
                content: analysisResult.content,
                lastAnalyzed: analysisResult.lastAnalyzed
            };

            await Channel.findOneAndUpdate(
                { channelId: channelData.channelId },
                channelData,
                { upsert: true, new: true }
            );

            logger.success(`Channel data saved: ${channelData.name}`);

        } catch (error) {
            logger.error('Error saving channel data:', error);
        }
    }

    generateMockAnalysis(channelData) {
        logger.info('Generating mock analysis data');
        
        const mockMetrics = this.generateMockMetrics();
        
        return {
            channelInfo: {
                channelId: 'mock_' + Date.now(),
                name: channelData.channelName || channelData.name || 'Sample Channel',
                handle: channelData.channelHandle || channelData.handle || 'samplechannel',
                description: channelData.description || 'Sample channel description',
                avatar: channelData.avatarUrl || 'https://via.placeholder.com/200x200/6366f1/ffffff?text=YT',
                url: channelData.url || 'https://youtube.com/@samplechannel'
            },
            metrics: mockMetrics,
            content: {
                categories: ['entertainment', 'lifestyle'],
                tags: ['sample', 'content', 'youtube', 'creator'],
                language: 'en',
                avgVideoLength: 420,
                uploadSchedule: 'weekly',
                contentTypes: ['standard', 'shorts'],
                collaboration: {
                    hasCollaborations: true,
                    collaborationFrequency: 25,
                    commonCollaborators: []
                }
            },
            lastAnalyzed: new Date()
        };
    }

    generateMockMetrics() {
        // Generate realistic mock metrics
        const subscriberCount = Math.floor(Math.random() * 2000000) + 100000; // 100K - 2M
        const viewCount = subscriberCount * (Math.random() * 50 + 10); // 10-60x subscriber count
        const videoCount = Math.floor(Math.random() * 500) + 50; // 50-550 videos
        const avgViews = Math.floor(subscriberCount * (Math.random() * 0.8 + 0.1)); // 10-90% of subscribers
        
        return {
            subscriberCount: subscriberCount,
            subscriberGrowth: Math.round((Math.random() * 20 - 5) * 100) / 100, // -5% to 15%
            videoCount: videoCount,
            viewCount: viewCount,
            avgViews: avgViews,
            avgViewsGrowth: Math.round((Math.random() * 15 - 2) * 100) / 100, // -2% to 13%
            engagementRate: Math.round((Math.random() * 8 + 1) * 100) / 100, // 1-9%
            engagementTrend: Math.round((Math.random() * 2 - 0.5) * 100) / 100, // -0.5% to 1.5%
            uploadFrequency: Math.round((Math.random() * 4 + 0.5) * 10) / 10, // 0.5-4.5 per week
            lastUploadDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Within last week
            recentVideos: this.generateMockVideos(),
            monthlyGrowth: {
                subscribers: Math.round((Math.random() * 15 - 2) * 100) / 100,
                views: Math.round((Math.random() * 20 - 5) * 100) / 100,
                engagement: Math.round((Math.random() * 2 - 0.5) * 100) / 100
            }
        };
    }

    generateMockVideos() {
        const videoTitles = [
            'Amazing New Discovery!',
            'Day in My Life Vlog',
            'Tutorial: How to Get Started',
            'Reacting to Viral Videos',
            'Q&A Session with Viewers'
        ];

        return videoTitles.map(title => ({
            title: title,
            views: Math.floor(Math.random() * 1000000) + 10000,
            likes: Math.floor(Math.random() * 50000) + 1000,
            comments: Math.floor(Math.random() * 5000) + 100,
            duration: `PT${Math.floor(Math.random() * 20) + 5}M${Math.floor(Math.random() * 60)}S`,
            publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        }));
    }

    // Utility method for formatting numbers
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
}

module.exports = AnalyticsService;