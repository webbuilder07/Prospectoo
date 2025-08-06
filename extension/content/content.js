// YouTube Influencer Analyzer - Content Script
class YouTubeContentAnalyzer {
    constructor() {
        this.isAnalyzing = false;
        this.overlayInjected = false;
        this.apiBase = 'http://localhost:3001/api';
        this.init();
    }

    init() {
        this.injectStyles();
        this.observePageChanges();
        this.addAnalysisOverlay();
        this.bindMessageListener();
    }

    injectStyles() {
        if (document.getElementById('yt-analyzer-styles')) return;
        
        const styles = `
            .yt-analyzer-overlay {
                position: fixed;
                top: 100px;
                right: 20px;
                width: 300px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                border: 1px solid #e5e7eb;
                transform: translateX(320px);
                transition: transform 0.3s ease;
            }
            
            .yt-analyzer-overlay.visible {
                transform: translateX(0);
            }
            
            .overlay-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 16px;
                border-radius: 12px 12px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .overlay-title {
                font-size: 14px;
                font-weight: 600;
                margin: 0;
            }
            
            .overlay-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: background 0.2s;
            }
            
            .overlay-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .overlay-content {
                padding: 16px;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .quick-stats {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-bottom: 16px;
            }
            
            .stat-item {
                text-align: center;
                padding: 12px;
                background: #f8fafc;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
            }
            
            .stat-label {
                font-size: 11px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }
            
            .stat-value {
                font-size: 16px;
                font-weight: 700;
                color: #111827;
            }
            
            .analysis-section {
                margin-bottom: 16px;
            }
            
            .section-title {
                font-size: 12px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 8px;
                padding-bottom: 4px;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .engagement-bar {
                height: 6px;
                background: #f3f4f6;
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .engagement-fill {
                height: 100%;
                background: linear-gradient(90deg, #10b981, #059669);
                border-radius: 3px;
                transition: width 0.5s ease;
            }
            
            .engagement-text {
                font-size: 11px;
                color: #6b7280;
                text-align: center;
            }
            
            .action-buttons {
                display: flex;
                gap: 8px;
                margin-top: 16px;
            }
            
            .btn-analyze {
                flex: 1;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 12px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-analyze:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }
            
            .btn-analyze:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            
            .btn-secondary {
                background: white;
                color: #374151;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                padding: 8px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-secondary:hover {
                background: #f9fafb;
                border-color: #9ca3af;
            }
            
            .loading-spinner {
                display: inline-block;
                width: 12px;
                height: 12px;
                border: 2px solid #f3f4f6;
                border-top: 2px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 6px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .yt-analyzer-trigger {
                position: fixed;
                top: 120px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 9998;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                transition: all 0.3s ease;
                color: white;
                font-size: 20px;
            }
            
            .yt-analyzer-trigger:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }
            
            .yt-analyzer-trigger.hidden {
                transform: scale(0);
                opacity: 0;
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.id = 'yt-analyzer-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    observePageChanges() {
        // Watch for YouTube navigation changes
        let currentUrl = location.href;
        
        const observer = new MutationObserver(() => {
            if (location.href !== currentUrl) {
                currentUrl = location.href;
                this.handlePageChange();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also listen for popstate events
        window.addEventListener('popstate', () => {
            setTimeout(() => this.handlePageChange(), 100);
        });
    }

    handlePageChange() {
        // Check if we're on a channel page
        if (this.isChannelPage()) {
            this.showTriggerButton();
        } else {
            this.hideTriggerButton();
            this.hideOverlay();
        }
    }

    isChannelPage() {
        const url = location.href;
        return url.includes('/channel/') || 
               url.includes('/c/') || 
               url.includes('/user/') || 
               url.includes('/@') ||
               (url.includes('youtube.com') && document.querySelector('#channel-name, .ytd-channel-name'));
    }

    addAnalysisOverlay() {
        if (this.overlayInjected) return;
        
        // Create trigger button
        const trigger = document.createElement('div');
        trigger.className = 'yt-analyzer-trigger hidden';
        trigger.innerHTML = '📊';
        trigger.title = 'Analyze Channel';
        trigger.addEventListener('click', () => this.toggleOverlay());
        document.body.appendChild(trigger);
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'yt-analyzer-overlay';
        overlay.innerHTML = `
            <div class="overlay-header">
                <h3 class="overlay-title">Channel Analysis</h3>
                <button class="overlay-close">×</button>
            </div>
            <div class="overlay-content">
                <div class="quick-stats">
                    <div class="stat-item">
                        <div class="stat-label">Subscribers</div>
                        <div class="stat-value" id="overlay-subs">-</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Engagement</div>
                        <div class="stat-value" id="overlay-engagement">-</div>
                    </div>
                </div>
                
                <div class="analysis-section">
                    <div class="section-title">Engagement Rate</div>
                    <div class="engagement-bar">
                        <div class="engagement-fill" style="width: 0%"></div>
                    </div>
                    <div class="engagement-text" id="engagement-details">Click analyze to see details</div>
                </div>
                
                <div class="analysis-section">
                    <div class="section-title">Quick Info</div>
                    <div style="font-size: 11px; color: #6b7280; line-height: 1.4;">
                        <div id="channel-category">Category: Loading...</div>
                        <div id="channel-country">Country: Loading...</div>
                        <div id="channel-joined">Joined: Loading...</div>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button class="btn-analyze" id="analyze-btn">
                        <span id="analyze-text">Analyze Channel</span>
                    </button>
                    <button class="btn-secondary" id="save-btn">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Bind overlay events
        overlay.querySelector('.overlay-close').addEventListener('click', () => this.hideOverlay());
        overlay.querySelector('#analyze-btn').addEventListener('click', () => this.performAnalysis());
        overlay.querySelector('#save-btn').addEventListener('click', () => this.saveToDatabase());
        
        this.trigger = trigger;
        this.overlay = overlay;
        this.overlayInjected = true;
        
        // Check if we should show trigger on page load
        if (this.isChannelPage()) {
            this.showTriggerButton();
        }
    }

    showTriggerButton() {
        if (this.trigger) {
            this.trigger.classList.remove('hidden');
        }
    }

    hideTriggerButton() {
        if (this.trigger) {
            this.trigger.classList.add('hidden');
        }
    }

    toggleOverlay() {
        if (this.overlay.classList.contains('visible')) {
            this.hideOverlay();
        } else {
            this.showOverlay();
        }
    }

    showOverlay() {
        if (this.overlay) {
            this.overlay.classList.add('visible');
            this.loadChannelBasics();
        }
    }

    hideOverlay() {
        if (this.overlay) {
            this.overlay.classList.remove('visible');
        }
    }

    async loadChannelBasics() {
        try {
            // Get basic channel info that's visible on the page
            const channelName = this.getChannelName();
            const subscriberCount = this.getSubscriberCount();
            const channelInfo = this.extractChannelInfo();
            
            // Update basic stats
            document.getElementById('overlay-subs').textContent = subscriberCount || 'Loading...';
            document.getElementById('channel-category').textContent = `Category: ${channelInfo.category || 'Loading...'}`;
            document.getElementById('channel-country').textContent = `Country: ${channelInfo.country || 'Loading...'}`;
            document.getElementById('channel-joined').textContent = `Joined: ${channelInfo.joinDate || 'Loading...'}`;
            
        } catch (error) {
            console.error('Error loading channel basics:', error);
        }
    }

    async performAnalysis() {
        if (this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        const analyzeBtn = document.getElementById('analyze-btn');
        const analyzeText = document.getElementById('analyze-text');
        
        // Update button state
        analyzeBtn.disabled = true;
        analyzeText.innerHTML = '<span class="loading-spinner"></span>Analyzing...';
        
        try {
            // Extract channel information
            const channelInfo = this.extractChannelInfo();
            
            // Get recent videos for engagement analysis
            const recentVideos = await this.getRecentVideos();
            
            // Calculate engagement metrics
            const engagementData = this.calculateEngagement(recentVideos);
            
            // Update UI with results
            this.updateAnalysisResults(channelInfo, engagementData);
            
            // Notify popup about the analysis
            chrome.runtime.sendMessage({
                type: 'ANALYSIS_COMPLETE',
                data: {
                    channelInfo,
                    engagementData,
                    recentVideos
                }
            });
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.showAnalysisError();
        } finally {
            this.isAnalyzing = false;
            analyzeBtn.disabled = false;
            analyzeText.textContent = 'Re-analyze';
        }
    }

    extractChannelInfo() {
        const url = location.href;
        const channelName = this.getChannelName();
        const subscriberCount = this.getSubscriberCount();
        
        // Extract channel ID from URL
        let channelId = null;
        let channelHandle = null;
        
        if (url.includes('/channel/')) {
            channelId = url.match(/\/channel\/([^\/\?]+)/)?.[1];
        } else if (url.includes('/c/') || url.includes('/user/')) {
            channelHandle = url.match(/\/(?:c|user)\/([^\/\?]+)/)?.[1];
        } else if (url.includes('/@')) {
            channelHandle = url.match(/\/@([^\/\?]+)/)?.[1];
        }
        
        // Get avatar
        const avatar = document.querySelector('#avatar img, .ytd-c4-tabbed-header-renderer img')?.src;
        
        // Try to extract additional info from page
        const description = document.querySelector('#description')?.textContent?.trim();
        const joinDate = this.extractJoinDate();
        const country = this.extractCountry();
        const category = this.extractCategory();
        
        return {
            channelId,
            channelHandle,
            channelName,
            subscriberCount,
            avatar,
            description,
            joinDate,
            country,
            category,
            url: location.href
        };
    }

    getChannelName() {
        const selectors = [
            '#text.ytd-channel-name',
            '.ytd-c4-tabbed-header-renderer #text',
            '.ytd-channel-name #text',
            'h1.ytd-channel-name',
            '#channel-name'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim();
            }
        }
        
        return null;
    }

    getSubscriberCount() {
        const selectors = [
            '#subscriber-count',
            '.ytd-c4-tabbed-header-renderer yt-formatted-string[title*="subscriber"]',
            'yt-formatted-string[title*="subscriber"]'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim();
            }
        }
        
        return null;
    }

    extractJoinDate() {
        // Look for join date in channel about section
        const aboutText = document.querySelector('#description, .ytd-channel-about-metadata-renderer')?.textContent;
        if (aboutText) {
            const joinMatch = aboutText.match(/Joined (\w+ \d+, \d+)/);
            if (joinMatch) {
                return joinMatch[1];
            }
        }
        return null;
    }

    extractCountry() {
        // Try to extract country from channel metadata
        const metadata = document.querySelector('.ytd-channel-about-metadata-renderer')?.textContent;
        if (metadata) {
            const countryMatch = metadata.match(/(?:Country|Location):?\s*([^\n]+)/i);
            if (countryMatch) {
                return countryMatch[1].trim();
            }
        }
        return null;
    }

    extractCategory() {
        // Try to extract category from video content
        const videos = document.querySelectorAll('#video-title');
        if (videos.length > 0) {
            // Simple categorization based on common keywords
            const titles = Array.from(videos).map(v => v.textContent.toLowerCase()).join(' ');
            
            if (titles.includes('gaming') || titles.includes('game') || titles.includes('gameplay')) {
                return 'Gaming';
            } else if (titles.includes('music') || titles.includes('song') || titles.includes('album')) {
                return 'Music';
            } else if (titles.includes('tech') || titles.includes('review') || titles.includes('unboxing')) {
                return 'Technology';
            } else if (titles.includes('cooking') || titles.includes('recipe') || titles.includes('food')) {
                return 'Food & Cooking';
            }
        }
        return null;
    }

    async getRecentVideos() {
        // Get video elements from the channel page
        const videoElements = document.querySelectorAll('#video-title-link, a#video-title');
        const videos = [];
        
        for (let i = 0; i < Math.min(videoElements.length, 20); i++) {
            const videoElement = videoElements[i];
            const title = videoElement.textContent.trim();
            const url = videoElement.href;
            const videoId = this.extractVideoId(url);
            
            if (videoId) {
                // Try to get view count and other metrics from the page
                const container = videoElement.closest('ytd-grid-video-renderer, ytd-rich-item-renderer');
                const viewsElement = container?.querySelector('#metadata-line span, .style-scope.ytd-video-meta-block');
                const views = viewsElement?.textContent?.match(/[\d,]+/)?.[0];
                
                videos.push({
                    videoId,
                    title,
                    url,
                    views: views ? parseInt(views.replace(/,/g, '')) : null,
                    element: container
                });
            }
        }
        
        return videos;
    }

    extractVideoId(url) {
        const match = url.match(/[?&]v=([^&]+)/);
        return match ? match[1] : null;
    }

    calculateEngagement(videos) {
        if (!videos.length) {
            return {
                averageViews: 0,
                totalViews: 0,
                videoCount: 0,
                engagementRate: 0
            };
        }
        
        const validVideos = videos.filter(v => v.views !== null);
        const totalViews = validVideos.reduce((sum, v) => sum + v.views, 0);
        const averageViews = totalViews / validVideos.length;
        
        // Estimate engagement rate (this would be more accurate with API data)
        const estimatedEngagementRate = Math.min(averageViews / 10000 * 100, 15); // Simple estimation
        
        return {
            averageViews: Math.round(averageViews),
            totalViews,
            videoCount: validVideos.length,
            engagementRate: Math.round(estimatedEngagementRate * 100) / 100
        };
    }

    updateAnalysisResults(channelInfo, engagementData) {
        // Update engagement display
        document.getElementById('overlay-engagement').textContent = `${engagementData.engagementRate}%`;
        
        // Update engagement bar
        const engagementFill = document.querySelector('.engagement-fill');
        const engagementText = document.getElementById('engagement-details');
        
        const engagementPercent = Math.min(engagementData.engagementRate * 10, 100);
        engagementFill.style.width = `${engagementPercent}%`;
        engagementText.textContent = `Avg ${this.formatNumber(engagementData.averageViews)} views per video`;
        
        // Update other stats
        if (channelInfo.subscriberCount) {
            document.getElementById('overlay-subs').textContent = channelInfo.subscriberCount;
        }
    }

    showAnalysisError() {
        document.getElementById('engagement-details').textContent = 'Analysis failed. Please try again.';
        document.getElementById('overlay-engagement').textContent = 'Error';
    }

    async saveToDatabase() {
        try {
            const channelInfo = this.extractChannelInfo();
            
            // Send to background script to save
            chrome.runtime.sendMessage({
                type: 'SAVE_CHANNEL',
                data: channelInfo
            }, (response) => {
                if (response && response.success) {
                    this.showToast('Channel saved successfully!');
                } else {
                    this.showToast('Failed to save channel');
                }
            });
            
        } catch (error) {
            console.error('Error saving channel:', error);
            this.showToast('Error saving channel');
        }
    }

    bindMessageListener() {
        // Listen for messages from popup or background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'GET_CHANNEL_INFO') {
                const channelInfo = this.extractChannelInfo();
                sendResponse({ channelInfo });
            } else if (request.type === 'SHOW_OVERLAY') {
                this.showOverlay();
            } else if (request.type === 'HIDE_OVERLAY') {
                this.hideOverlay();
            }
        });
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize content analyzer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new YouTubeContentAnalyzer();
    });
} else {
    new YouTubeContentAnalyzer();
}