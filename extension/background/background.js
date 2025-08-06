// YouTube Influencer Analyzer - Background Service Worker
class BackgroundService {
    constructor() {
        this.apiBase = 'http://localhost:3001/api';
        this.initializeListeners();
    }

    initializeListeners() {
        // Handle extension installation
        chrome.runtime.onInstalled.addListener(this.handleInstall.bind(this));

        // Handle messages from content scripts and popup
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

        // Handle tab updates to detect YouTube navigation
        chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));

        // Handle storage changes
        chrome.storage.onChanged.addListener(this.handleStorageChange.bind(this));
    }

    async handleInstall(details) {
        console.log('YouTube Influencer Analyzer installed:', details.reason);

        // Set up default settings
        await chrome.storage.sync.set({
            settings: {
                autoAnalyze: false,
                showOverlay: true,
                saveHistory: true,
                emailFinder: true,
                similarChannels: true
            },
            apiKeys: {
                youtubeApi: '',
                openaiApi: ''
            },
            usage: {
                analysisCount: 0,
                emailsFound: 0,
                channelsSaved: 0
            }
        });

        // Open welcome page
        if (details.reason === 'install') {
            chrome.tabs.create({
                url: 'http://localhost:3000/welcome'
            });
        }
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.type) {
                case 'ANALYZE_CHANNEL':
                    return await this.analyzeChannel(request.data, sendResponse);
                
                case 'FIND_EMAIL':
                    return await this.findChannelEmail(request.data, sendResponse);
                
                case 'SAVE_CHANNEL':
                    return await this.saveChannel(request.data, sendResponse);
                
                case 'GET_SIMILAR_CHANNELS':
                    return await this.getSimilarChannels(request.data, sendResponse);
                
                case 'EXPORT_DATA':
                    return await this.exportChannelData(request.data, sendResponse);
                
                case 'GET_STORAGE_DATA':
                    return await this.getStorageData(request.key, sendResponse);
                
                case 'UPDATE_SETTINGS':
                    return await this.updateSettings(request.data, sendResponse);
                
                case 'GET_USAGE_STATS':
                    return await this.getUsageStats(sendResponse);
                
                default:
                    console.log('Unknown message type:', request.type);
                    sendResponse({ error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ error: error.message });
        }

        return true; // Keep message channel open for async response
    }

    async handleTabUpdate(tabId, changeInfo, tab) {
        // Check if tab is YouTube and has finished loading
        if (changeInfo.status === 'complete' && 
            tab.url && 
            tab.url.includes('youtube.com')) {
            
            // Get settings to check if auto-analyze is enabled
            const storage = await chrome.storage.sync.get(['settings']);
            const settings = storage.settings || {};
            
            if (settings.autoAnalyze && this.isChannelPage(tab.url)) {
                // Notify content script to start analysis
                chrome.tabs.sendMessage(tabId, {
                    type: 'AUTO_ANALYZE',
                    url: tab.url
                });
            }
        }
    }

    handleStorageChange(changes, namespace) {
        console.log('Storage changed:', changes, 'in', namespace);
    }

    isChannelPage(url) {
        return url.includes('/channel/') || 
               url.includes('/c/') || 
               url.includes('/user/') || 
               url.includes('/@');
    }

    async analyzeChannel(channelData, sendResponse) {
        try {
            // First try to get data from API
            const response = await fetch(`${this.apiBase}/analyze-channel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(channelData)
            });

            if (response.ok) {
                const data = await response.json();
                
                // Update usage stats
                await this.incrementUsageCount('analysisCount');
                
                sendResponse({ success: true, data });
                return;
            }
        } catch (error) {
            console.log('API not available, using fallback analysis');
        }

        // Fallback to local analysis if API is not available
        const analysisData = await this.performLocalAnalysis(channelData);
        await this.incrementUsageCount('analysisCount');
        
        sendResponse({ success: true, data: analysisData });
    }

    async performLocalAnalysis(channelData) {
        // Mock analysis data when backend is not available
        const subscriberCount = this.parseSubscriberCount(channelData.subscriberCount);
        
        return {
            channelInfo: {
                name: channelData.channelName || 'Unknown Channel',
                handle: channelData.channelHandle || 'unknown',
                avatar: channelData.avatarUrl || '',
                subscribers: subscriberCount,
                description: channelData.description || ''
            },
            metrics: {
                subscribers: this.formatNumber(subscriberCount),
                subscriberGrowth: this.generateGrowthRate(),
                engagementRate: this.estimateEngagementRate(subscriberCount),
                engagementTrend: this.generateTrendIndicator(),
                avgViews: this.estimateAverageViews(subscriberCount),
                viewsTrend: this.generateTrendIndicator(),
                uploadFreq: this.estimateUploadFrequency()
            },
            demographics: {
                ageGroup: this.generateAgeDistribution(),
                genderSplit: this.generateGenderSplit(),
                topLocation: this.estimateTopLocation(),
                fakeScore: this.generateFakeFollowerScore()
            },
            analysis: {
                category: channelData.category || 'Entertainment',
                country: channelData.country || 'United States',
                joinDate: channelData.joinDate || 'Unknown',
                verified: subscriberCount > 100000,
                monetized: subscriberCount > 1000
            }
        };
    }

    async findChannelEmail(channelData, sendResponse) {
        try {
            // Try API first
            const response = await fetch(`${this.apiBase}/find-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(channelData)
            });

            if (response.ok) {
                const emailData = await response.json();
                await this.incrementUsageCount('emailsFound');
                sendResponse({ success: true, data: emailData });
                return;
            }
        } catch (error) {
            console.log('Email API not available, using mock data');
        }

        // Fallback to mock email for demo
        const mockEmail = this.generateMockEmail(channelData);
        if (mockEmail) {
            await this.incrementUsageCount('emailsFound');
        }
        
        sendResponse({ 
            success: true, 
            data: { 
                email: mockEmail,
                businessEmail: null,
                confidence: 'medium',
                source: 'demo'
            }
        });
    }

    async saveChannel(channelData, sendResponse) {
        try {
            // Try to save to backend API
            const response = await fetch(`${this.apiBase}/save-channel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(channelData)
            });

            if (response.ok) {
                await this.incrementUsageCount('channelsSaved');
                sendResponse({ success: true });
                return;
            }
        } catch (error) {
            console.log('Save API not available, saving locally');
        }

        // Fallback to local storage
        await this.saveChannelLocally(channelData);
        await this.incrementUsageCount('channelsSaved');
        
        sendResponse({ success: true, local: true });
    }

    async saveChannelLocally(channelData) {
        try {
            const storage = await chrome.storage.local.get(['savedChannels']);
            const savedChannels = storage.savedChannels || [];
            
            // Add timestamp and ID
            const channelWithMetadata = {
                ...channelData,
                id: Date.now().toString(),
                savedAt: new Date().toISOString()
            };
            
            // Remove duplicate if exists
            const filteredChannels = savedChannels.filter(
                ch => ch.channelInfo?.name !== channelData.channelInfo?.name
            );
            
            filteredChannels.unshift(channelWithMetadata);
            
            // Keep only last 100 channels
            const trimmedChannels = filteredChannels.slice(0, 100);
            
            await chrome.storage.local.set({ savedChannels: trimmedChannels });
        } catch (error) {
            console.error('Error saving channel locally:', error);
        }
    }

    async getSimilarChannels(channelData, sendResponse) {
        try {
            // Try API first
            const response = await fetch(`${this.apiBase}/similar-channels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(channelData)
            });

            if (response.ok) {
                const similarData = await response.json();
                sendResponse({ success: true, data: similarData });
                return;
            }
        } catch (error) {
            console.log('Similar channels API not available, using mock data');
        }

        // Generate mock similar channels
        const mockSimilar = this.generateSimilarChannels(channelData);
        sendResponse({ success: true, data: { channels: mockSimilar } });
    }

    async exportChannelData(channelData, sendResponse) {
        try {
            const exportData = {
                channel: channelData.channelInfo.name,
                exportDate: new Date().toISOString(),
                metrics: channelData.metrics,
                demographics: channelData.demographics,
                analysis: channelData.analysis || {},
                url: channelData.channelInfo.url || ''
            };

            // Create download
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const filename = `yt-analysis-${channelData.channelInfo.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`;
            
            await chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true
            });

            sendResponse({ success: true });
        } catch (error) {
            console.error('Export error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async getStorageData(key, sendResponse) {
        try {
            const data = await chrome.storage.sync.get([key]);
            sendResponse({ success: true, data: data[key] });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async updateSettings(settings, sendResponse) {
        try {
            await chrome.storage.sync.set({ settings });
            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async getUsageStats(sendResponse) {
        try {
            const storage = await chrome.storage.sync.get(['usage']);
            const usage = storage.usage || {
                analysisCount: 0,
                emailsFound: 0,
                channelsSaved: 0
            };
            sendResponse({ success: true, data: usage });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async incrementUsageCount(metric) {
        try {
            const storage = await chrome.storage.sync.get(['usage']);
            const usage = storage.usage || {};
            usage[metric] = (usage[metric] || 0) + 1;
            await chrome.storage.sync.set({ usage });
        } catch (error) {
            console.error('Error updating usage stats:', error);
        }
    }

    // Utility functions for mock data generation
    parseSubscriberCount(subString) {
        if (!subString) return 1000;
        
        const cleanString = subString.replace(/[^\d.KMB]/gi, '');
        const num = parseFloat(cleanString);
        
        if (cleanString.includes('M')) return Math.round(num * 1000000);
        if (cleanString.includes('K')) return Math.round(num * 1000);
        if (cleanString.includes('B')) return Math.round(num * 1000000000);
        
        return Math.round(num) || 1000;
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    generateGrowthRate() {
        const rates = ['+2.3%', '+5.7%', '+8.1%', '+12.4%', '-1.2%', '+0.8%', '+15.2%'];
        return rates[Math.floor(Math.random() * rates.length)];
    }

    estimateEngagementRate(subscribers) {
        // Higher subscriber count typically means lower engagement rate
        if (subscribers > 1000000) return '1.5%';
        if (subscribers > 100000) return '2.8%';
        if (subscribers > 10000) return '4.2%';
        return '6.5%';
    }

    generateTrendIndicator() {
        const trends = ['+0.2%', '+0.5%', '-0.1%', '+1.2%', '+0.8%', '-0.3%'];
        return trends[Math.floor(Math.random() * trends.length)];
    }

    estimateAverageViews(subscribers) {
        const viewRatio = Math.random() * 0.1 + 0.05; // 5-15% of subscribers
        return this.formatNumber(Math.round(subscribers * viewRatio));
    }

    estimateUploadFrequency() {
        const frequencies = ['1.5', '2.1', '3.2', '4.7', '1.8', '2.9'];
        return frequencies[Math.floor(Math.random() * frequencies.length)];
    }

    generateAgeDistribution() {
        const distributions = [
            '18-34 (65%)',
            '25-44 (58%)', 
            '18-24 (72%)',
            '35-54 (45%)',
            '13-24 (68%)'
        ];
        return distributions[Math.floor(Math.random() * distributions.length)];
    }

    generateGenderSplit() {
        const splits = [
            '60% M / 40% F',
            '45% M / 55% F',
            '70% M / 30% F',
            '52% M / 48% F',
            '38% M / 62% F'
        ];
        return splits[Math.floor(Math.random() * splits.length)];
    }

    estimateTopLocation() {
        const locations = [
            'United States',
            'United Kingdom', 
            'Canada',
            'Australia',
            'Germany',
            'India'
        ];
        return locations[Math.floor(Math.random() * locations.length)];
    }

    generateFakeFollowerScore() {
        const scores = ['1.2%', '2.3%', '3.1%', '0.8%', '4.2%', '1.7%'];
        return scores[Math.floor(Math.random() * scores.length)];
    }

    generateMockEmail(channelData) {
        const channelName = channelData.channelName || channelData.name || 'channel';
        const cleanName = channelName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const domains = [
            'gmail.com', 
            'business.email', 
            'contact.me',
            'studio.com',
            'media.co'
        ];
        
        const domain = domains[Math.floor(Math.random() * domains.length)];
        
        // Only return email 70% of the time to simulate realistic success rate
        if (Math.random() > 0.3) {
            return `${cleanName}@${domain}`;
        }
        
        return null;
    }

    generateSimilarChannels(channelData) {
        const baseSubscribers = this.parseSubscriberCount(channelData.subscriberCount);
        
        const similarChannels = [];
        const channelNames = [
            'Tech Reviews Pro',
            'Gaming Central Hub',
            'Music Vibes Official',
            'Cooking Master Class',
            'Fitness Journey',
            'Travel Adventures',
            'DIY Creative Studio',
            'Science Explained',
            'Art & Design Hub',
            'Business Insights'
        ];
        
        for (let i = 0; i < 5; i++) {
            const variation = (Math.random() - 0.5) * 0.6; // ±30% variation
            const similarSubs = Math.round(baseSubscribers * (1 + variation));
            const score = Math.round((85 + Math.random() * 10) * 10) / 10; // 85-95% similarity
            
            similarChannels.push({
                name: channelNames[i],
                subscribers: this.formatNumber(similarSubs),
                avatar: '',
                score: `${score}%`,
                category: channelData.category || 'Entertainment'
            });
        }
        
        return similarChannels;
    }
}

// Initialize the background service
new BackgroundService();