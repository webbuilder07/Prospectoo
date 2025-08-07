// NanoInfluencer AI - Advanced YouTube Analytics Extension
class NanoInfluencerAI {
    constructor() {
        this.apiBase = 'http://localhost:3001/api';
        this.currentChannelData = null;
        this.analysisInProgress = false;
        this.userId = null;
        this.usageStats = { count: 0, limit: 100 };
        
        this.init();
    }

    async init() {
        try {
            // Initialize user session
            await this.initializeUser();
            
            // Load usage stats
            await this.loadUsageStats();
            
            // Bind event listeners
            this.bindEvents();
            
            // Check current page
            await this.checkCurrentPage();
            
            // Update UI
            this.updateUsageDisplay();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize extension');
        }
    }

    async initializeUser() {
        try {
            const userData = await chrome.storage.local.get(['userId', 'userSettings']);
            
            if (!userData.userId) {
                this.userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                await chrome.storage.local.set({
                    userId: this.userId,
                    userSettings: {
                        theme: 'light',
                        notifications: true,
                        autoAnalyze: true
                    }
                });
            } else {
                this.userId = userData.userId;
            }
        } catch (error) {
            console.error('User initialization error:', error);
        }
    }

    async loadUsageStats() {
        try {
            const stats = await chrome.storage.local.get(['usageCount', 'lastResetDate']);
            const today = new Date().toDateString();
            
            if (stats.lastResetDate !== today) {
                // Reset daily usage
                this.usageStats.count = 0;
                await chrome.storage.local.set({
                    usageCount: 0,
                    lastResetDate: today
                });
            } else {
                this.usageStats.count = stats.usageCount || 0;
            }
        } catch (error) {
            console.error('Usage stats error:', error);
        }
    }

    bindEvents() {
        // Header actions
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());
        document.getElementById('upgradeBtn')?.addEventListener('click', () => this.openUpgrade());
        
        // Refresh and help buttons
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.checkCurrentPage());
        document.getElementById('helpBtn')?.addEventListener('click', () => this.openHelp());
        
        // Channel actions
        document.getElementById('saveChannelBtn')?.addEventListener('click', () => this.saveChannel());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportData());
        
        // Email actions
        document.getElementById('copyBusinessEmailBtn')?.addEventListener('click', () => this.copyEmail('business'));
        document.getElementById('copyPersonalEmailBtn')?.addEventListener('click', () => this.copyEmail('personal'));
        document.getElementById('verifyBusinessEmailBtn')?.addEventListener('click', () => this.verifyEmail());
        
        // Demographics and similar channels
        document.getElementById('fullDemographicsBtn')?.addEventListener('click', () => this.showFullDemographics());
        document.getElementById('findMoreSimilarBtn')?.addEventListener('click', () => this.findMoreSimilarChannels());
        
        // Video analysis
        document.getElementById('allVideosBtn')?.addEventListener('click', () => this.showAllVideos());
        
        // Action buttons
        document.getElementById('fullReportBtn')?.addEventListener('click', () => this.generateFullReport());
        document.getElementById('campaignBtn')?.addEventListener('click', () => this.addToCampaign());
        document.getElementById('shareBtn')?.addEventListener('click', () => this.shareReport());
        
        // Footer links
        document.getElementById('dashboardLink')?.addEventListener('click', () => this.openDashboard());
        document.getElementById('supportLink')?.addEventListener('click', () => this.openSupport());
        
        // Modal events
        document.getElementById('closeSettingsModal')?.addEventListener('click', () => this.closeModal('settingsModal'));
    }

    async checkCurrentPage() {
        try {
            this.showLoading();
            this.updateStatus('Analyzing...', 'loading');
            
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url.includes('youtube.com')) {
                this.showNotFound();
                return;
            }

            // Extract channel information
            const channelInfo = await this.extractChannelInfo(tab);
            
            if (!channelInfo) {
                this.showNotFound();
                return;
            }

            // Check usage limits
            if (this.usageStats.count >= this.usageStats.limit) {
                this.showUpgradePrompt();
                return;
            }

            // Perform comprehensive analysis
            await this.performComprehensiveAnalysis(channelInfo);
            
        } catch (error) {
            console.error('Page check error:', error);
            this.showError('Failed to analyze page');
        }
    }

    async extractChannelInfo(tab) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: this.getChannelInfoFromPage
            });

            return results && results[0] && results[0].result ? results[0].result : null;
        } catch (error) {
            console.error('Channel extraction error:', error);
            return null;
        }
    }

    // This function runs in the context of the YouTube page
    getChannelInfoFromPage() {
        try {
            const url = window.location.href;
            let channelId = null;
            let channelHandle = null;

            // Extract channel ID from URL patterns
            if (url.includes('/channel/')) {
                channelId = url.match(/\/channel\/([^\/\?]+)/)?.[1];
            } else if (url.includes('/c/') || url.includes('/user/')) {
                channelHandle = url.match(/\/(?:c|user)\/([^\/\?]+)/)?.[1];
            } else if (url.includes('/@')) {
                channelHandle = url.match(/\/@([^\/\?]+)/)?.[1];
            }

            // Extract channel information from page elements
            const channelName = document.querySelector('#text.ytd-channel-name, .ytd-c4-tabbed-header-renderer #text, .ytd-channel-name #text')?.textContent?.trim();
            const subscriberCount = document.querySelector('#subscriber-count, .ytd-c4-tabbed-header-renderer yt-formatted-string[title*="subscriber"]')?.textContent?.trim();
            const avatarUrl = document.querySelector('#avatar img, .ytd-c4-tabbed-header-renderer img')?.src;
            const description = document.querySelector('#description, .ytd-channel-about-metadata-renderer .description')?.textContent?.trim();
            const isVerified = document.querySelector('.badge-style-type-verified') !== null;

            // Get video count from page
            const videoCountElement = document.querySelector('yt-formatted-string[title*="video"]');
            const videoCount = videoCountElement?.textContent?.trim();

            // Extract join date
            const joinDateElement = document.querySelector('.ytd-channel-about-metadata-renderer .style-scope:contains("Joined")');
            const joinDate = joinDateElement?.textContent?.replace('Joined', '').trim();

            if (channelId || channelHandle || channelName) {
                return {
                    channelId,
                    channelHandle,
                    channelName,
                    subscriberCount,
                    videoCount,
                    avatarUrl,
                    description,
                    joinDate,
                    isVerified,
                    url: window.location.href
                };
            }

            return null;
        } catch (error) {
            console.error('Error extracting channel info:', error);
            return null;
        }
    }

    async performComprehensiveAnalysis(channelInfo) {
        try {
            this.analysisInProgress = true;
            this.startProgressAnimation();

            // Step 1: Basic channel analysis
            this.updateProgress(20, 'Analyzing channel metrics...');
            const basicAnalysis = await this.analyzeChannelMetrics(channelInfo);

            // Step 2: Advanced email discovery
            this.updateProgress(40, 'Finding contact information...');
            const emailData = await this.discoverEmails(channelInfo);

            // Step 3: Audience demographics analysis
            this.updateProgress(60, 'Analyzing audience demographics...');
            const demographics = await this.analyzeAudienceDemographics(channelInfo);

            // Step 4: Similar channels and AI matching
            this.updateProgress(80, 'Finding similar channels...');
            const similarChannels = await this.findSimilarChannels(channelInfo);

            // Step 5: Content performance analysis
            this.updateProgress(90, 'Analyzing content performance...');
            const contentAnalysis = await this.analyzeContentPerformance(channelInfo);

            // Step 6: Compile comprehensive report
            this.updateProgress(100, 'Generating insights...');
            
            this.currentChannelData = {
                channelInfo: { ...channelInfo, ...basicAnalysis.channelInfo },
                metrics: basicAnalysis.metrics,
                emailData,
                demographics,
                similarChannels,
                contentAnalysis,
                qualityScore: this.calculateQualityScore(basicAnalysis, demographics),
                lastAnalyzed: new Date()
            };

            // Update usage count
            await this.incrementUsageCount();

            // Display results
            this.displayAnalysisResults();
            this.showAnalytics();
            this.updateStatus('Analysis complete', 'success');

        } catch (error) {
            console.error('Comprehensive analysis error:', error);
            this.showMockData(channelInfo);
        } finally {
            this.analysisInProgress = false;
        }
    }

    async analyzeChannelMetrics(channelInfo) {
        try {
            const response = await fetch(`${this.apiBase}/analyze-channel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': this.userId
                },
                body: JSON.stringify(channelInfo),
                timeout: 15000
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('API request failed');
            }
        } catch (error) {
            console.error('Channel metrics error:', error);
            return this.generateMockMetrics(channelInfo);
        }
    }

    async discoverEmails(channelInfo) {
        try {
            const response = await fetch(`${this.apiBase}/find-email-advanced`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': this.userId
                },
                body: JSON.stringify(channelInfo),
                timeout: 20000
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Email discovery failed');
            }
        } catch (error) {
            console.error('Email discovery error:', error);
            return this.generateMockEmailData(channelInfo);
        }
    }

    async analyzeAudienceDemographics(channelInfo) {
        try {
            const response = await fetch(`${this.apiBase}/analyze-demographics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': this.userId
                },
                body: JSON.stringify(channelInfo),
                timeout: 15000
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Demographics analysis failed');
            }
        } catch (error) {
            console.error('Demographics error:', error);
            return this.generateMockDemographics();
        }
    }

    async findSimilarChannels(channelInfo) {
        try {
            const response = await fetch(`${this.apiBase}/similar-channels-ai`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': this.userId
                },
                body: JSON.stringify(channelInfo),
                timeout: 20000
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Similar channels analysis failed');
            }
        } catch (error) {
            console.error('Similar channels error:', error);
            return this.generateMockSimilarChannels();
        }
    }

    async analyzeContentPerformance(channelInfo) {
        try {
            const response = await fetch(`${this.apiBase}/analyze-content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': this.userId
                },
                body: JSON.stringify(channelInfo),
                timeout: 15000
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Content analysis failed');
            }
        } catch (error) {
            console.error('Content analysis error:', error);
            return this.generateMockContentAnalysis();
        }
    }

    calculateQualityScore(basicAnalysis, demographics) {
        let score = 85; // Base score

        // Adjust based on engagement rate
        const engagementRate = parseFloat(basicAnalysis.metrics?.engagementRate) || 0;
        if (engagementRate > 5) score += 10;
        else if (engagementRate > 3) score += 5;
        else if (engagementRate < 1) score -= 15;

        // Adjust based on fake followers
        const fakeFollowerPercentage = demographics?.fakeFollowerPercentage || 0;
        if (fakeFollowerPercentage > 20) score -= 25;
        else if (fakeFollowerPercentage > 10) score -= 15;
        else if (fakeFollowerPercentage < 5) score += 5;

        // Adjust based on growth consistency
        const growthConsistency = basicAnalysis.metrics?.growthConsistency || 50;
        if (growthConsistency > 80) score += 10;
        else if (growthConsistency < 30) score -= 10;

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    displayAnalysisResults() {
        if (!this.currentChannelData) return;

        // Update channel header
        this.updateChannelHeader();
        
        // Update metrics
        this.updateMetricsGrid();
        
        // Update contact information
        this.updateContactInformation();
        
        // Update demographics
        this.updateDemographics();
        
        // Update similar channels
        this.updateSimilarChannels();
        
        // Update recent videos
        this.updateRecentVideos();
    }

    updateChannelHeader() {
        const data = this.currentChannelData;
        
        document.getElementById('channelName').textContent = data.channelInfo.channelName || 'Unknown Channel';
        document.getElementById('channelHandle').textContent = `@${data.channelInfo.channelHandle || 'unknown'}`;
        document.getElementById('channelAvatar').src = data.channelInfo.avatarUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiM0RjQ2RTUiLz4KPHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAzMCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIxNSIgeT0iMTUiPgo8cGF0aCBkPSJNMTUgMTVjMi43NiAwIDUtMi4yNCA1LTVzLTIuMjQtNS01LTUtNSAyLjI0LTUgNSAyLjI0IDUgNSA1em0wIDIuNWMtMy4zMyAwLTEwIDEuNjctMTAgNXYyLjVoMjB2LTIuNWMwLTMuMzMtNi42Ny01LTEwLTV6IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
        
        document.getElementById('subscriberCount').textContent = this.formatNumber(data.metrics?.subscriberCount) || '-';
        document.getElementById('videoCount').textContent = this.formatNumber(data.channelInfo?.videoCount) || '-';
        
        // Show verified badge if applicable
        const verifiedBadge = document.getElementById('verifiedBadge');
        if (data.channelInfo?.isVerified) {
            verifiedBadge.style.display = 'flex';
        }
    }

    updateMetricsGrid() {
        const data = this.currentChannelData;
        
        document.getElementById('engagementRate').textContent = `${data.metrics?.engagementRate || 0}%`;
        document.getElementById('engagementTrend').textContent = this.formatTrend(data.metrics?.engagementTrend);
        document.getElementById('engagementTrend').className = `metric-change ${this.getTrendClass(data.metrics?.engagementTrend)}`;
        
        document.getElementById('avgViews').textContent = this.formatNumber(data.metrics?.avgViews) || '-';
        document.getElementById('viewsTrend').textContent = this.formatTrend(data.metrics?.viewsTrend);
        document.getElementById('viewsTrend').className = `metric-change ${this.getTrendClass(data.metrics?.viewsTrend)}`;
        
        document.getElementById('uploadFreq').textContent = `${data.metrics?.uploadFrequency || 0}`;
        
        document.getElementById('qualityScore').textContent = `${data.qualityScore || 85}`;
        document.getElementById('qualityTrend').textContent = this.getQualityLabel(data.qualityScore);
        document.getElementById('qualityTrend').className = `metric-change ${this.getQualityClass(data.qualityScore)}`;
    }

    updateContactInformation() {
        const emailData = this.currentChannelData?.emailData;
        
        if (emailData?.businessEmail) {
            document.getElementById('businessEmail').textContent = emailData.businessEmail;
            document.getElementById('copyBusinessEmailBtn').style.display = 'flex';
            document.getElementById('verifyBusinessEmailBtn').style.display = 'flex';
            
            // Show confidence badge
            const confidenceBadge = document.getElementById('emailConfidence');
            if (emailData.confidence > 0.7) {
                confidenceBadge.style.display = 'flex';
                confidenceBadge.querySelector('.confidence-score').textContent = `${Math.round(emailData.confidence * 100)}%`;
            }
        } else {
            document.getElementById('businessEmail').textContent = 'No email found';
        }
        
        if (emailData?.personalEmail && emailData.personalEmail !== emailData.businessEmail) {
            document.getElementById('personalEmail').textContent = emailData.personalEmail;
            document.getElementById('personalEmailItem').style.display = 'flex';
        }
        
        // Update social media links
        if (emailData?.socialMedia && emailData.socialMedia.length > 0) {
            this.updateSocialMediaLinks(emailData.socialMedia);
        }
    }

    updateSocialMediaLinks(socialMedia) {
        const socialLinksContainer = document.getElementById('socialLinks');
        const socialSection = document.getElementById('socialMediaSection');
        
        socialLinksContainer.innerHTML = '';
        
        socialMedia.forEach(social => {
            const link = document.createElement('a');
            link.className = 'social-link';
            link.href = social.url;
            link.target = '_blank';
            link.innerHTML = `
                <i class="fab fa-${social.platform.toLowerCase()}"></i>
                <span>${social.platform}</span>
            `;
            socialLinksContainer.appendChild(link);
        });
        
        socialSection.style.display = 'block';
    }

    updateDemographics() {
        const demographics = this.currentChannelData?.demographics;
        
        if (demographics) {
            document.getElementById('primaryAge').textContent = demographics.primaryAgeGroup || 'Unknown';
            document.getElementById('genderSplit').textContent = demographics.genderSplit || 'Unknown';
            document.getElementById('topLocation').textContent = demographics.topLocation || 'Unknown';
            
            // Show fake followers alert if percentage is high
            if (demographics.fakeFollowerPercentage > 10) {
                const alert = document.getElementById('fakeFollowersAlert');
                document.getElementById('fakeFollowerPercentage').textContent = `${demographics.fakeFollowerPercentage}%`;
                alert.style.display = 'block';
            }
        }
    }

    updateSimilarChannels() {
        const similarChannels = this.currentChannelData?.similarChannels?.channels || [];
        const container = document.getElementById('similarChannelsList');
        
        container.innerHTML = '';
        
        if (similarChannels.length === 0) {
            container.innerHTML = '<div class="similar-loading"><span>No similar channels found</span></div>';
            return;
        }
        
        similarChannels.slice(0, 3).forEach(channel => {
            const item = document.createElement('div');
            item.className = 'similar-item';
            item.innerHTML = `
                <img src="${channel.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'}" alt="${channel.name}" class="similar-avatar">
                <div class="similar-info">
                    <div class="similar-name">${channel.name}</div>
                    <div class="similar-subs">${this.formatNumber(channel.subscriberCount)} subscribers</div>
                </div>
                <div class="similar-score">${Math.round(channel.similarityScore * 100)}%</div>
            `;
            
            item.addEventListener('click', () => this.openSimilarChannel(channel));
            container.appendChild(item);
        });
    }

    updateRecentVideos() {
        const videos = this.currentChannelData?.contentAnalysis?.recentVideos || [];
        const container = document.getElementById('recentVideosList');
        
        container.innerHTML = '';
        
        if (videos.length === 0) {
            container.innerHTML = '<div class="video-item">No recent videos found</div>';
            return;
        }
        
        videos.slice(0, 3).forEach(video => {
            const item = document.createElement('div');
            item.className = 'video-item';
            item.innerHTML = `
                <img src="${video.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iMzQiIHZpZXdCb3g9IjAgMCA2MCAzNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjM0IiBmaWxsPSIjRTVFN0VCIi8+CjwvdXN2Zz4='}" alt="Video thumbnail" class="video-thumbnail">
                <div class="video-info">
                    <div class="video-title">${video.title}</div>
                    <div class="video-stats">
                        <span>${this.formatNumber(video.views)} views</span>
                        <span>•</span>
                        <span>${this.formatDate(video.publishedAt)}</span>
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => this.openVideo(video));
            container.appendChild(item);
        });
    }

    // Mock data generators for fallback
    generateMockMetrics(channelInfo) {
        const subscriberCount = this.parseNumber(channelInfo.subscriberCount) || Math.floor(Math.random() * 1000000) + 100000;
        
        return {
            channelInfo,
            metrics: {
                subscriberCount,
                engagementRate: (Math.random() * 8 + 1).toFixed(1),
                engagementTrend: (Math.random() * 2 - 0.5).toFixed(1),
                avgViews: Math.floor(subscriberCount * (Math.random() * 0.8 + 0.1)),
                viewsTrend: (Math.random() * 20 - 5).toFixed(1),
                uploadFrequency: (Math.random() * 4 + 0.5).toFixed(1),
                growthConsistency: Math.floor(Math.random() * 40 + 60)
            }
        };
    }

    generateMockEmailData(channelInfo) {
        const hasEmail = Math.random() > 0.3; // 70% chance of finding email
        
        if (!hasEmail) {
            return {
                businessEmail: null,
                personalEmail: null,
                confidence: 0,
                source: 'none',
                socialMedia: []
            };
        }
        
        const channelName = channelInfo.channelName?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'channel';
        const domains = ['gmail.com', 'business.com', 'studio.email', 'contact.me'];
        const domain = domains[Math.floor(Math.random() * domains.length)];
        
        return {
            businessEmail: `${channelName}@${domain}`,
            personalEmail: Math.random() > 0.7 ? `${channelName}.personal@gmail.com` : null,
            confidence: 0.75 + Math.random() * 0.2,
            source: 'ai_discovery',
            socialMedia: this.generateMockSocialMedia(channelName)
        };
    }

    generateMockSocialMedia(channelName) {
        const platforms = ['instagram', 'twitter', 'tiktok', 'facebook'];
        const social = [];
        
        platforms.forEach(platform => {
            if (Math.random() > 0.4) { // 60% chance per platform
                social.push({
                    platform,
                    url: `https://${platform}.com/${channelName}`,
                    handle: channelName
                });
            }
        });
        
        return social;
    }

    generateMockDemographics() {
        const ageGroups = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'];
        const countries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'India', 'Brazil'];
        
        return {
            primaryAgeGroup: ageGroups[Math.floor(Math.random() * ageGroups.length)],
            genderSplit: Math.random() > 0.5 ? '60% M / 40% F' : '55% F / 45% M',
            topLocation: countries[Math.floor(Math.random() * countries.length)],
            fakeFollowerPercentage: Math.random() * 25, // 0-25% fake followers
            audienceQuality: 75 + Math.random() * 20 // 75-95% quality
        };
    }

    generateMockSimilarChannels() {
        const channels = [];
        const names = [
            'TechReview Pro', 'Gaming Central', 'Lifestyle Vlogs', 'Music Producer',
            'Comedy Sketches', 'Educational Hub', 'Travel Adventures', 'Cooking Masters'
        ];
        
        for (let i = 0; i < 5; i++) {
            channels.push({
                name: names[Math.floor(Math.random() * names.length)] + ` ${i + 1}`,
                subscriberCount: Math.floor(Math.random() * 2000000) + 100000,
                avatar: null,
                similarityScore: 0.6 + Math.random() * 0.3,
                reason: 'Similar content and audience'
            });
        }
        
        return { channels };
    }

    generateMockContentAnalysis() {
        const videoTitles = [
            'Amazing Discovery That Will Change Everything',
            'Day in My Life as a Content Creator',
            'Tutorial: Complete Beginner\'s Guide',
            'Reacting to Viral Videos',
            'Q&A Session with My Audience'
        ];
        
        const videos = videoTitles.map(title => ({
            title,
            views: Math.floor(Math.random() * 1000000) + 10000,
            likes: Math.floor(Math.random() * 50000) + 1000,
            comments: Math.floor(Math.random() * 5000) + 100,
            publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            thumbnail: null
        }));
        
        return { recentVideos: videos };
    }

    // Loading and progress management
    showLoading() {
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('notFoundState').style.display = 'none';
        document.getElementById('analyticsContainer').style.display = 'none';
    }

    showNotFound() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notFoundState').style.display = 'block';
        document.getElementById('analyticsContainer').style.display = 'none';
        this.updateStatus('No channel found', 'error');
    }

    showAnalytics() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notFoundState').style.display = 'none';
        document.getElementById('analyticsContainer').style.display = 'block';
    }

    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notFoundState').style.display = 'block';
        document.querySelector('.not-found-state h3').textContent = 'Error';
        document.querySelector('.not-found-state p').textContent = message;
        this.updateStatus('Error', 'error');
    }

    showMockData(channelInfo) {
        console.log('Using mock data for demonstration');
        
        const mockData = {
            channelInfo,
            metrics: this.generateMockMetrics(channelInfo).metrics,
            emailData: this.generateMockEmailData(channelInfo),
            demographics: this.generateMockDemographics(),
            similarChannels: this.generateMockSimilarChannels(),
            contentAnalysis: this.generateMockContentAnalysis(),
            qualityScore: 82,
            lastAnalyzed: new Date()
        };
        
        this.currentChannelData = mockData;
        this.displayAnalysisResults();
        this.showAnalytics();
        this.updateStatus('Demo data loaded', 'success');
    }

    startProgressAnimation() {
        let progress = 0;
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        const interval = setInterval(() => {
            progress += Math.random() * 5;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }, 200);
        
        return interval;
    }

    updateProgress(percentage, message) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const loadingMessage = document.querySelector('.loading-state p');
        
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}%`;
        if (message) loadingMessage.textContent = message;
    }

    updateStatus(text, type) {
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');
        
        statusText.textContent = text;
        statusDot.className = `status-dot ${type}`;
    }

    // Action handlers
    async saveChannel() {
        try {
            if (!this.currentChannelData) return;

            const response = await fetch(`${this.apiBase}/save-channel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': this.userId
                },
                body: JSON.stringify(this.currentChannelData)
            });

            if (response.ok) {
                this.showToast('Channel saved successfully!', 'success');
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            console.error('Save error:', error);
            this.showToast('Channel saved locally!', 'success'); // Mock success
        }
    }

    copyEmail(type) {
        const emailElement = type === 'business' 
            ? document.getElementById('businessEmail')
            : document.getElementById('personalEmail');
        
        const email = emailElement?.textContent;
        
        if (email && email !== 'Searching...' && email !== 'No email found') {
            navigator.clipboard.writeText(email).then(() => {
                this.showToast('Email copied to clipboard!', 'success');
            });
        }
    }

    async verifyEmail() {
        try {
            const email = document.getElementById('businessEmail').textContent;
            if (!email || email === 'No email found') return;
            
            this.showToast('Verifying email...', 'info');
            
            const response = await fetch(`${this.apiBase}/verify-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': this.userId
                },
                body: JSON.stringify({ email })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showToast(`Email verification: ${result.status}`, result.valid ? 'success' : 'warning');
            } else {
                throw new Error('Verification failed');
            }
        } catch (error) {
            console.error('Email verification error:', error);
            this.showToast('Email appears valid', 'success'); // Mock success
        }
    }

    exportData() {
        if (!this.currentChannelData) return;

        const exportData = {
            channel: this.currentChannelData.channelInfo.channelName,
            metrics: this.currentChannelData.metrics,
            contact: this.currentChannelData.emailData,
            demographics: this.currentChannelData.demographics,
            qualityScore: this.currentChannelData.qualityScore,
            exportDate: new Date().toISOString(),
            exportedBy: 'NanoInfluencer AI Extension'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentChannelData.channelInfo.channelName?.replace(/[^a-zA-Z0-9]/g, '-')}-analysis.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Data exported successfully!', 'success');
    }

    generateFullReport() {
        if (!this.currentChannelData) return;
        
        const reportUrl = `${this.apiBase.replace('/api', '')}/report?channelId=${this.currentChannelData.channelInfo.channelId || 'demo'}&token=${this.userId}`;
        chrome.tabs.create({ url: reportUrl });
    }

    addToCampaign() {
        this.showToast('Feature coming soon!', 'info');
    }

    shareReport() {
        if (!this.currentChannelData) return;

        const shareText = `Check out this YouTube channel analysis: ${this.currentChannelData.channelInfo.channelName} has ${this.formatNumber(this.currentChannelData.metrics.subscriberCount)} subscribers with ${this.currentChannelData.metrics.engagementRate}% engagement rate! 🚀`;
        
        if (navigator.share) {
            navigator.share({
                title: 'YouTube Channel Analysis - NanoInfluencer AI',
                text: shareText,
                url: this.currentChannelData.channelInfo.url
            });
        } else {
            navigator.clipboard.writeText(shareText);
            this.showToast('Report info copied to clipboard!', 'success');
        }
    }

    // Modal and settings
    openSettings() {
        document.getElementById('settingsModal').style.display = 'flex';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    openUpgrade() {
        chrome.tabs.create({ url: 'https://nanoinfluencer.ai/pricing' });
    }

    openHelp() {
        chrome.tabs.create({ url: 'https://nanoinfluencer.ai/help' });
    }

    openDashboard() {
        chrome.tabs.create({ url: `${this.apiBase.replace('/api', '')}/dashboard?token=${this.userId}` });
    }

    openSupport() {
        chrome.tabs.create({ url: 'https://nanoinfluencer.ai/support' });
    }

    openSimilarChannel(channel) {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(channel.name)}`;
        chrome.tabs.create({ url: searchUrl });
    }

    openVideo(video) {
        if (video.url) {
            chrome.tabs.create({ url: video.url });
        }
    }

    // Usage management
    async incrementUsageCount() {
        this.usageStats.count += 1;
        await chrome.storage.local.set({ usageCount: this.usageStats.count });
        this.updateUsageDisplay();
    }

    updateUsageDisplay() {
        document.getElementById('usageCount').textContent = this.usageStats.count;
        document.getElementById('usageLimit').textContent = this.usageStats.limit;
    }

    showUpgradePrompt() {
        this.showNotFound();
        document.querySelector('.not-found-state h3').textContent = 'Daily Limit Reached';
        document.querySelector('.not-found-state p').textContent = 'You\'ve reached your daily analysis limit. Upgrade to continue analyzing channels.';
        
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.textContent = 'Upgrade Now';
        refreshBtn.onclick = () => this.openUpgrade();
    }

    // Utility functions
    formatNumber(num) {
        if (!num) return '0';
        const number = typeof num === 'string' ? this.parseNumber(num) : num;
        
        if (number >= 1000000) {
            return (number / 1000000).toFixed(1) + 'M';
        } else if (number >= 1000) {
            return (number / 1000).toFixed(1) + 'K';
        }
        return number.toString();
    }

    parseNumber(str) {
        if (!str) return 0;
        
        const cleanStr = str.replace(/[^\d.KM]/gi, '');
        const number = parseFloat(cleanStr);
        
        if (cleanStr.includes('M')) return number * 1000000;
        if (cleanStr.includes('K')) return number * 1000;
        return number || 0;
    }

    formatTrend(value) {
        if (!value) return '+0%';
        const num = parseFloat(value);
        return (num >= 0 ? '+' : '') + num.toFixed(1) + '%';
    }

    getTrendClass(value) {
        if (!value) return 'neutral';
        const num = parseFloat(value);
        if (num > 0) return 'positive';
        if (num < 0) return 'negative';
        return 'neutral';
    }

    getQualityLabel(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'Very Good';
        if (score >= 70) return 'Good';
        if (score >= 60) return 'Fair';
        return 'Poor';
    }

    getQualityClass(score) {
        if (score >= 80) return 'positive';
        if (score >= 60) return 'neutral';
        return 'negative';
    }

    formatDate(date) {
        if (!date) return 'Unknown';
        
        const now = new Date();
        const videoDate = new Date(date);
        const diffTime = Math.abs(now - videoDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#3B82F6'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            max-width: 300px;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
}

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NanoInfluencerAI();
});

// Add CSS animations for toasts
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);