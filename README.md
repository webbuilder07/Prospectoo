# YouTube Influencer Analyzer - Complete Clone of NanoInfluencer.ai

A comprehensive YouTube influencer analysis platform with Chrome extension, featuring email discovery, audience analytics, similar channel finding, and campaign management.

## 🚀 Features

### Core Features (Same as NanoInfluencer.ai)
- **YouTube Channel Analytics**: Detailed metrics including engagement rates, subscriber growth, view analytics
- **Email Discovery**: AI-powered email finding from social media profiles and public sources  
- **Similar Channel Finder**: AI algorithm to find lookalike influencers based on content and audience
- **Audience Demographics**: Age, gender, location, and interest analysis
- **Fake Follower Detection**: Advanced algorithms to detect inauthentic subscribers
- **Campaign Management**: CRM for managing influencer outreach and campaigns
- **Content Analysis**: Video performance analytics and trending content identification
- **Export Functionality**: CSV/Excel export for all data

### Technical Stack
- **Extension**: Chrome Extension (Manifest V3)
- **Backend**: Node.js, Express.js, MongoDB
- **Frontend**: React.js with modern UI
- **APIs**: YouTube Data API v3, Social Media APIs
- **AI/ML**: Python microservices for ML algorithms

## 📁 Project Structure

```
youtube-influencer-analyzer/
├── extension/                 # Chrome Extension
│   ├── manifest.json
│   ├── popup/
│   ├── content/
│   └── background/
├── server/                    # Backend API
│   ├── routes/
│   ├── models/
│   ├── services/
│   └── utils/
├── frontend/                  # React Dashboard
│   ├── src/
│   ├── public/
│   └── components/
├── ml-services/              # Python ML Services
│   ├── similarity/
│   ├── demographics/
│   └── email-finder/
└── docs/                     # Documentation
```

## 🛠️ Installation

1. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

2. **Set up environment variables:**
   ```bash
   cp server/.env.example server/.env
   # Add your API keys and database config
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

4. **Load Chrome Extension:**
   - Open Chrome -> Extensions -> Developer mode
   - Load unpacked -> Select `extension/` folder

## 🔧 API Keys Required

- YouTube Data API v3
- MongoDB Atlas (or local MongoDB)
- OpenAI API (for AI features)
- Various social media APIs for email discovery

## 🌟 Key Differentiators

This implementation provides:
- **100% Free**: No $59/month subscription needed
- **Open Source**: Fully customizable and extensible
- **Real-time Analytics**: Live data updates
- **Advanced ML**: Custom algorithms for better accuracy
- **Scalable Architecture**: Handle thousands of channels

## 📊 Supported Analytics

- Subscriber count and growth trends
- Video view analytics and engagement rates  
- Audience demographics (age, gender, location)
- Content performance metrics
- Social media cross-platform analysis
- Email contact discovery
- Similar channel recommendations

## 🚀 Getting Started

1. Clone this repository
2. Follow installation steps above
3. Get required API keys
4. Load extension in Chrome
5. Start analyzing YouTube influencers!

## 📄 License

MIT License - Feel free to use and modify for your needs.