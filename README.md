# YouTube Influencer Analyzer

A **100% free**, open-source Chrome extension and full-stack application for analyzing YouTube influencers. Built as a complete alternative to paid services like NanoInfluencer.ai, focusing specifically on YouTube creator analysis.

## 🚀 Key Features

### 📊 **Core Analytics**
- **Channel Metrics**: Subscriber count, engagement rates, view analytics, upload frequency
- **Performance Tracking**: Growth trends, monthly analytics, video performance metrics
- **Content Analysis**: Category detection, content types, collaboration patterns

### 📧 **Email Discovery** 
- **Bio-Based Email Search**: Extracts contact emails directly from YouTube channel descriptions
- **Smart Filtering**: Identifies business emails and filters out non-contact addresses
- **Instant Access**: One-click copy to clipboard for outreach

### 🔍 **Similar Channel Discovery**
- **AI-Powered Matching**: Find channels with similar content and audience
- **Similarity Scoring**: Ranked results with detailed similarity metrics
- **Competitive Analysis**: Discover new influencers in your niche

### 💾 **Campaign Management**
- **Save Channels**: Build your influencer database
- **Campaign Tracking**: Organize outreach campaigns
- **Export Data**: CSV/JSON export for external tools

### ⚡ **Real-Time Analysis**
- **Live Data**: Direct integration with YouTube Data API v3
- **Instant Results**: Fast analysis with caching for performance
- **Chrome Extension**: Analyze channels directly on YouTube

## 🛠️ Technical Stack

- **Frontend**: Chrome Extension (Manifest V3), React.js Dashboard
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **APIs**: YouTube Data API v3
- **Deployment**: Self-hosted, Docker-ready

## 📁 Project Structure

```
youtube-influencer-analyzer/
├── 🔌 extension/          # Chrome Extension
│   ├── manifest.json     # Extension configuration
│   ├── popup/            # Extension popup UI
│   ├── content/          # Page injection scripts
│   └── background/       # Service worker
├── 🚀 server/            # Backend API
│   ├── services/         # Analytics, Email, Similarity
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API endpoints
│   └── utils/            # Logging, helpers
├── 🎨 frontend/          # React Dashboard (optional)
└── 📚 docs/              # Documentation
```

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 16+ and npm
- MongoDB (local or Atlas)
- YouTube Data API v3 key (free from Google Cloud Console)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd youtube-influencer-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Configure environment**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your API keys
   ```

4. **Start the backend**
   ```bash
   npm run server
   ```

5. **Load Chrome extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `extension/` folder

6. **Start analyzing!**
   - Visit any YouTube channel
   - Click the extension icon to analyze

## 🔑 Required API Keys

### YouTube Data API v3 (Required)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Add the key to `server/.env` as `YOUTUBE_API_KEY`

## 🎯 Key Differentiators

- **🆓 100% Free**: No subscription fees or usage limits
- **🔓 Open Source**: Fully customizable and transparent
- **🎯 YouTube Focused**: Specialized for YouTube creator analysis  
- **⚡ Real-Time**: Live data from YouTube API
- **🏠 Self-Hosted**: Complete control over your data
- **🔒 Privacy First**: No data tracking or sharing

## 📊 Supported Analytics

### Channel Metrics
- Subscriber count and growth trends
- Average views and engagement rates
- Upload frequency and consistency
- Recent video performance

### Content Analysis
- Category and topic detection
- Content type identification (shorts, tutorials, vlogs)
- Collaboration pattern analysis
- Upload schedule detection

### Email Discovery
- Direct bio/description scanning
- Business email identification
- Contact information extraction
- Confidence scoring

## 🚀 Getting Started

1. **Set up the backend** following the installation steps
2. **Install the Chrome extension** in developer mode
3. **Navigate to any YouTube channel** page
4. **Click the extension icon** to start analysis
5. **View detailed metrics** in the popup
6. **Copy contact emails** with one click
7. **Save channels** to your database
8. **Export data** for your campaigns

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines and submit pull requests for any improvements.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Setup Instructions](./SETUP_INSTRUCTIONS.md)
- [API Documentation](http://localhost:3001/api/docs)
- [Chrome Extension Guide](./extension/README.md)

---

**Built with ❤️ for the creator economy**