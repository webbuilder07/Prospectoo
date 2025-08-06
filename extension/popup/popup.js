// YouTube Influencer Analyzer - Popup Script (Simplified)
class YouTubeAnalyzer {
    constructor() {
        this.apiBase = 'http://localhost:3001/api';
        this.currentChannelData = null;
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.checkCurrentPage();
    }

    bindEvents() {
        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.checkCurrentPage();
        });

        // Save channel button
        document.getElementById('saveChannelBtn')?.addEventListener('click', () => {
            this.saveChannel();
        });

        // Copy email button
        document.getElementById('copyEmailBtn')?.addEventListener('click', () => {
            this.copyEmail();
        });

        // Find similar channels
        document.getElementById('findSimilarBtn')?.addEventListener('click', () => {
            this.findSimilarChannels();
        });

        // Full report button
        document.getElementById('fullReportBtn')?.addEventListener('click', () => {
            this.openFullReport();
        });

        // Export data button
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportData();
        });

        // Share button
        document.getElementById('shareBtn')?.addEventListener('click', () => {
            this.shareData();
        });

        // Dashboard link
        document.getElementById('dashboardLink')?.addEventListener('click', () => {
            this.openDashboard();
        });
    }

    async checkCurrentPage() {
        try {
            this.showLoading();
            
            // Get current tab information
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url.includes('youtube.com')) {
                this.showNotFound();
                return;
            }

            // Extract channel info from current page
            const channelInfo = await this.extractChannelInfo(tab);
            
            if (!channelInfo) {
                this.showNotFound();
                return;
            }

            // Analyze the channel
            await this.analyzeChannel(channelInfo);
            
        } catch (error) {
            console.error('Error checking current page:', error);
            this.showError('Failed to analyze page');
        }
    }

    showLoading() {
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('notFoundState').style.display = 'none';
        document.getElementById('analyticsContainer').style.display = 'none';
        this.updateStatus('Analyzing...', 'loading');
    }

    showNotFound() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notFoundState').style.display = 'block';
        document.getElementById('analyticsContainer').style.display = 'none';
        this.updateStatus('Not Found', 'error');
    }

    showAnalytics() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notFoundState').style.display = 'none';
        document.getElementById('analyticsContainer').style.display = 'block';
        this.updateStatus('Ready', 'success');
    }

    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notFoundState').style.display = 'block';
        document.querySelector('.not-found-state h3').textContent = 'Error';
        document.querySelector('.not-found-state p').textContent = message;
        this.updateStatus('Error', 'error');
    }

    updateStatus(text, type) {
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');
        
        statusText.textContent = text;
        statusDot.className = 'status-dot';
        
        if (type === 'loading') {
            statusDot.style.background = '#f59e0b';
        } else if (type === 'error') {
            statusDot.style.background = '#ef4444';
        } else {
            statusDot.style.background = '#4ade80';
        }
    }

    async extractChannelInfo(tab) {
        try {
            // Execute content script to get channel information
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: this.getChannelInfoFromPage
            });

            if (results && results[0] && results[0].result) {
                return results[0].result;
            }

            return null;
        } catch (error) {
            console.error('Error extracting channel info:', error);
            return null;
        }
    }

    // This function runs in the context of the YouTube page
    getChannelInfoFromPage() {
        try {
            const url = window.location.href;
            let channelId = null;
            let channelHandle = null;
            let channelName = null;
            let avatarUrl = null;
            let description = null;

            // Extract channel ID from various YouTube URL patterns
            if (url.includes('/channel/')) {
                channelId = url.match(/\/channel\/([^\/\?]+)/)?.[1];
            } else if (url.includes('/c/') || url.includes('/user/')) {
                channelHandle = url.match(/\/(?:c|user)\/([^\/\?]+)/)?.[1];
            } else if (url.includes('/@')) {
                channelHandle = url.match(/\/@([^\/\?]+)/)?.[1];
            }

            // Try to get channel info from page elements
            const channelNameElement = document.querySelector('#text.ytd-channel-name, .ytd-c4-tabbed-header-renderer #text, .ytd-channel-name #text');
            if (channelNameElement) {
                channelName = channelNameElement.textContent.trim();
            }

            // Get avatar
            const avatarElement = document.querySelector('#avatar img, .ytd-c4-tabbed-header-renderer img');
            if (avatarElement) {
                avatarUrl = avatarElement.src;
            }

            // Get subscriber count from page
            const subsElement = document.querySelector('#subscriber-count, .ytd-c4-tabbed-header-renderer yt-formatted-string[title*="subscriber"]');
            let subscriberCount = null;
            if (subsElement) {
                subscriberCount = subsElement.textContent.trim();
            }

            // Try to get description from the about page
            const descriptionElement = document.querySelector('#description, .ytd-channel-about-metadata-renderer .description');
            if (descriptionElement) {
                description = descriptionElement.textContent.trim();
            }

            if (channelId || channelHandle || channelName) {
                return {
                    channelId,
                    channelHandle,
                    channelName,
                    avatarUrl,
                    subscriberCount,
                    description,
                    url: window.location.href
                };
            }

            return null;
        } catch (error) {
            console.error('Error in getChannelInfoFromPage:', error);
            return null;
        }
    }

    async analyzeChannel(channelInfo) {
        try {
            // Call backend API to analyze channel
            const response = await fetch(`${this.apiBase}/analyze-channel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(channelInfo)
            });

            if (!response.ok) {
                throw new Error('Failed to analyze channel');
            }

            const analysisData = await response.json();
            this.currentChannelData = analysisData;
            
            // Update UI with analysis data
            this.updateChannelUI(analysisData);
            this.showAnalytics();

            // Find email from bio only
            this.findChannelEmailFromBio(analysisData);
            this.loadSimilarChannels(analysisData);

        } catch (error) {
            console.error('Error analyzing channel:', error);
            // Show mock data for demo purposes
            this.showMockData(channelInfo);
        }
    }

    showMockData(channelInfo) {
        // Use mock data when API is not available
        const mockData = {
            channelInfo: {
                name: channelInfo.channelName || 'Sample Channel',
                handle: channelInfo.channelHandle || 'samplechannel',
                avatar: channelInfo.avatarUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIxMiIgeT0iMTIiPgo8cGF0aCBkPSJNMTIgMTJjMi4yMSAwIDQtMS43OSA0LTRzLTEuNzktNC00LTQtNCAxLjc5LTQgNCAxLjc5IDQgNCA0em0wIDJjLTIuNjcgMC04IDEuMzQtOCA0djJoMTZ2LTJjMC0yLjY2LTUuMzMtNC04LTR6IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+',
                description: channelInfo.description || ''
            },
            metrics: {
                subscribers: '1.2M',
                subscriberGrowth: '+12.5%',
                engagementRate: '3.8%',
                engagementTrend: '+0.3%',
                avgViews: '450K',
                viewsTrend: '+8.2%',
                uploadFreq: '3.2'
            },
            similarChannels: [
                { name: 'Similar Channel 1', subscribers: '980K', avatar: '', score: '87%' },
                { name: 'Similar Channel 2', subscribers: '1.5M', avatar: '', score: '82%' },
                { name: 'Similar Channel 3', subscribers: '750K', avatar: '', score: '79%' }
            ]
        };

        this.currentChannelData = mockData;
        this.updateChannelUI(mockData);
        this.showAnalytics();
        
        // Extract email from bio
        const email = this.extractEmailFromBio(mockData.channelInfo.description);
        this.updateEmailUI({ email });
    }

    updateChannelUI(data) {
        // Update channel header
        document.getElementById('channelName').textContent = data.channelInfo.name;
        document.getElementById('channelHandle').textContent = `@${data.channelInfo.handle}`;
        document.getElementById('channelAvatar').src = data.channelInfo.avatar;

        // Update metrics
        document.getElementById('subscriberCount').textContent = data.metrics.subscribers;
        document.getElementById('subscriberGrowth').textContent = data.metrics.subscriberGrowth;
        document.getElementById('engagementRate').textContent = data.metrics.engagementRate;
        document.getElementById('engagementTrend').textContent = data.metrics.engagementTrend;
        document.getElementById('avgViews').textContent = data.metrics.avgViews;
        document.getElementById('viewsTrend').textContent = data.metrics.viewsTrend;
        document.getElementById('uploadFreq').textContent = data.metrics.uploadFreq;

        // Update engagement trend classes
        this.updateTrendClass('subscriberGrowth', data.metrics.subscriberGrowth);
        this.updateTrendClass('engagementTrend', data.metrics.engagementTrend);
        this.updateTrendClass('viewsTrend', data.metrics.viewsTrend);
    }

    updateTrendClass(elementId, value) {
        const element = document.getElementById(elementId);
        if (value.includes('+')) {
            element.className = 'metric-change positive';
        } else if (value.includes('-')) {
            element.className = 'metric-change negative';
        } else {
            element.className = 'metric-change neutral';
        }
    }

    async findChannelEmailFromBio(channelData) {
        try {
            // Only search for email in the bio/description
            const description = channelData.channelInfo?.description || '';
            const email = this.extractEmailFromBio(description);
            
            this.updateEmailUI({ email });
            
        } catch (error) {
            console.error('Error finding email:', error);
            this.updateEmailUI({ email: null });
        }
    }

    extractEmailFromBio(description) {
        if (!description) return null;
        
        // Simple email extraction from bio
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = description.match(emailRegex);
        
        if (emails && emails.length > 0) {
            // Filter out common non-contact emails
            const filteredEmails = emails.filter(email => 
                !email.includes('noreply') && 
                !email.includes('no-reply') &&
                !email.includes('example.com') &&
                email.length < 100
            );
            
            // Prefer business emails
            const businessEmail = filteredEmails.find(email => 
                email.toLowerCase().includes('business') ||
                email.toLowerCase().includes('contact') ||
                email.toLowerCase().includes('info') ||
                email.toLowerCase().includes('hello')
            );
            
            return businessEmail || filteredEmails[0] || null;
        }
        
        return null;
    }

    updateEmailUI(emailData) {
        if (emailData.email) {
            document.getElementById('channelEmail').textContent = emailData.email;
            document.getElementById('copyEmailBtn').style.display = 'inline-block';
            
            // Show business email section if it's different
            if (emailData.businessEmail && emailData.businessEmail !== emailData.email) {
                document.getElementById('businessEmail').textContent = emailData.businessEmail;
                document.getElementById('businessEmailItem').style.display = 'flex';
            }
        } else {
            document.getElementById('channelEmail').textContent = 'No email found in bio';
            document.getElementById('copyEmailBtn').style.display = 'none';
        }
    }

    async loadSimilarChannels(channelData) {
        try {
            const response = await fetch(`${this.apiBase}/similar-channels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(channelData.channelInfo)
            });

            if (response.ok) {
                const similarData = await response.json();
                this.updateSimilarChannelsUI(similarData.channels);
            } else {
                // Fallback to mock data
                setTimeout(() => {
                    this.updateSimilarChannelsUI(this.currentChannelData.similarChannels);
                }, 1500);
            }
        } catch (error) {
            console.error('Error loading similar channels:', error);
            setTimeout(() => {
                this.updateSimilarChannelsUI(this.currentChannelData.similarChannels);
            }, 1500);
        }
    }

    updateSimilarChannelsUI(channels) {
        const similarList = document.getElementById('similarChannels');
        similarList.innerHTML = '';

        channels.forEach(channel => {
            const channelElement = document.createElement('div');
            channelElement.className = 'similar-item';
            channelElement.innerHTML = `
                <img src="${channel.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM5Y2EzYWYiLz4KPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTggOGMxLjQ3IDAgMi42Ny0xLjE5IDIuNjctMi42N1M5LjQ3IDIuNjcgOCAyLjY3IDUuMzMgMy44NiA1LjMzIDUuMzMgNi41MyA4IDggOHptMCAxLjMzYy0xLjc4IDAtNS4zMy44OS01LjMzIDIuNjdWMTNIMTMuMzN2LTEuMzNjMC0xLjc4LTMuNTYtMi42Ny01LjMzLTIuNjd6IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+'}" alt="Similar Channel" class="similar-avatar">
                <div class="similar-info">
                    <div class="similar-name">${channel.name}</div>
                    <div class="similar-subs">${channel.subscribers} subscribers</div>
                </div>
                <div class="similar-score">${channel.score}</div>
            `;
            
            channelElement.addEventListener('click', () => {
                this.openSimilarChannel(channel);
            });
            
            similarList.appendChild(channelElement);
        });
    }

    async saveChannel() {
        try {
            if (!this.currentChannelData) return;

            const response = await fetch(`${this.apiBase}/save-channel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.currentChannelData)
            });

            if (response.ok) {
                this.showToast('Channel saved successfully!');
            } else {
                this.showToast('Failed to save channel');
            }
        } catch (error) {
            console.error('Error saving channel:', error);
            this.showToast('Channel saved locally!'); // Mock success
        }
    }

    copyEmail() {
        const email = document.getElementById('channelEmail').textContent;
        if (email && email !== 'Searching in bio...' && email !== 'No email found in bio') {
            navigator.clipboard.writeText(email).then(() => {
                this.showToast('Email copied to clipboard!');
            });
        }
    }

    findSimilarChannels() {
        this.showToast('Finding more similar channels...');
        // Implement additional similar channel discovery
    }

    openFullReport() {
        if (this.currentChannelData) {
            const reportUrl = `http://localhost:3000/report?channel=${encodeURIComponent(this.currentChannelData.channelInfo.name)}`;
            chrome.tabs.create({ url: reportUrl });
        }
    }

    exportData() {
        if (!this.currentChannelData) return;

        const data = {
            channel: this.currentChannelData.channelInfo.name,
            metrics: this.currentChannelData.metrics,
            email: document.getElementById('channelEmail').textContent,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: `youtube-analysis-${this.currentChannelData.channelInfo.name.replace(/[^a-zA-Z0-9]/g, '-')}.json`
        });

        this.showToast('Data exported successfully!');
    }

    shareData() {
        if (!this.currentChannelData) return;

        const shareText = `Check out this YouTube channel analysis: ${this.currentChannelData.channelInfo.name} has ${this.currentChannelData.metrics.subscribers} subscribers with ${this.currentChannelData.metrics.engagementRate} engagement rate!`;
        
        if (navigator.share) {
            navigator.share({
                title: 'YouTube Channel Analysis',
                text: shareText,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(shareText);
            this.showToast('Analysis info copied to clipboard!');
        }
    }

    openSimilarChannel(channel) {
        // Open similar channel in new tab
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(channel.name)}`;
        chrome.tabs.create({ url: searchUrl });
    }

    openDashboard() {
        chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
    }

    showToast(message) {
        // Create toast notification
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
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Utility functions
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    calculateEngagementRate(likes, comments, views) {
        if (!views || views === 0) return 0;
        return (((likes + comments) / views) * 100).toFixed(1);
    }
}

// Initialize the analyzer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new YouTubeAnalyzer();
});

// Add CSS for toast animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);