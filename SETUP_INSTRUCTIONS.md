# YouTube Influencer Analyzer - Setup Instructions

## 🚀 Complete Setup Guide

This guide will help you set up the complete YouTube Influencer Analyzer system - a 100% working clone of NanoInfluencer.ai focused on YouTube influencer analysis.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 16 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or MongoDB Atlas account)
- **Git**
- **Google Chrome** (for the extension)

## 🔧 Step 1: Install Dependencies

```bash
# Install all dependencies for the entire project
npm run install-all

# Or install manually:
npm install
cd server && npm install
cd ../frontend && npm install  # (if you plan to build the dashboard)
cd ../extension && npm install
```

## 🔑 Step 2: Get Required API Keys

### YouTube Data API v3 (Required)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Create credentials (API key)
5. Copy your API key

### Optional API Keys (for enhanced functionality)
- **OpenAI API Key**: For advanced AI features
- **Hunter.io API Key**: For email discovery
- **Clearbit API Key**: For company data enrichment

## ⚙️ Step 3: Configure Environment Variables

1. Copy the environment template:
```bash
cp server/.env.example server/.env
```

2. Edit `server/.env` with your API keys:
```env
# Required
YOUTUBE_API_KEY=your_youtube_api_key_here
MONGODB_URI=mongodb://localhost:27017/youtube-analyzer

# Optional but recommended
OPENAI_API_KEY=your_openai_key_here
HUNTER_IO_API_KEY=your_hunter_io_key_here
CLEARBIT_API_KEY=your_clearbit_key_here

# Database (if using MongoDB Atlas)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/youtube-analyzer

# Server Configuration
PORT=3001
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_here
```

## 🗄️ Step 4: Set Up Database

### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service:
```bash
# On macOS
brew services start mongodb-community

# On Linux
sudo systemctl start mongod

# On Windows
net start MongoDB
```

### Option B: MongoDB Atlas (Recommended)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string and update `MONGODB_URI` in `.env`

## 🚀 Step 5: Start the Backend Server

```bash
# Start the backend API server
cd server
npm run dev

# Or from the root directory
npm run server
```

The server will start on `http://localhost:3001`

## 🔌 Step 6: Install the Chrome Extension

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `extension/` folder from this project
6. The extension will appear in your Chrome toolbar

## 🧪 Step 7: Test the System

1. **Test Backend API:**
```bash
# Health check
curl http://localhost:3001/health

# API documentation
curl http://localhost:3001/api/docs
```

2. **Test Chrome Extension:**
   - Navigate to any YouTube channel page
   - Click the extension icon in Chrome toolbar
   - You should see the popup with channel analysis

3. **Test Content Script:**
   - On a YouTube channel page, look for the floating analytics button
   - Click it to see the overlay analysis

## 🎯 Step 8: Usage Guide

### Using the Chrome Extension

1. **Navigate to a YouTube Channel:**
   - Go to any YouTube channel (e.g., `https://www.youtube.com/@channelname`)

2. **Analyze Channel:**
   - Click the extension icon in your toolbar
   - The popup will automatically detect the channel and start analysis
   - View metrics, demographics, and contact information

3. **Use Page Overlay:**
   - Look for the floating analytics button on the right side of the page
   - Click to see detailed analysis overlay
   - Save channels for later reference

### Key Features Available

- ✅ **Channel Analytics**: Subscriber count, engagement rate, view analytics
- ✅ **Email Discovery**: Find creator contact emails
- ✅ **Similar Channels**: AI-powered lookalike channel finder
- ✅ **Audience Demographics**: Age, gender, location analysis
- ✅ **Fake Follower Detection**: Quality score analysis
- ✅ **Export Functionality**: CSV/JSON export of data
- ✅ **Campaign Management**: Save and organize influencers

## 🛠️ Development & Customization

### Adding Your Own YouTube API Key

1. Get your YouTube Data API v3 key from Google Cloud Console
2. Add it to `server/.env`:
```env
YOUTUBE_API_KEY=your_actual_api_key_here
```

### Customizing the Analysis

Edit `server/services/analyticsService.js` to modify:
- Engagement rate calculations
- Demographic estimations
- Quality score algorithms

### Adding More Email Sources

Edit `server/services/emailService.js` to add:
- Additional social media platforms
- More email discovery methods
- Custom email validation rules

## 🚨 Troubleshooting

### Common Issues

1. **Extension Not Loading:**
   - Ensure Chrome Developer Mode is enabled
   - Check for JavaScript errors in the Chrome Developer Tools

2. **API Errors:**
   - Verify your YouTube API key is correct and has quota remaining
   - Check that the server is running on port 3001

3. **Database Connection Issues:**
   - Verify MongoDB is running (local) or connection string is correct (Atlas)
   - Check network connectivity

4. **CORS Errors:**
   - The server is configured to allow Chrome extension origins
   - Verify the extension has proper host permissions

### Debug Mode

Enable debug logging by setting in `server/.env`:
```env
NODE_ENV=development
LOG_LEVEL=debug
```

## 📈 Scaling for Production

### Performance Optimizations

1. **Database Indexing:**
   - Indexes are already set up in the Channel model
   - Consider adding more indexes based on your query patterns

2. **Caching:**
   - Implement Redis caching for frequently accessed data
   - Cache YouTube API responses to reduce quota usage

3. **Rate Limiting:**
   - Already implemented in the server
   - Adjust limits in `server/index.js` as needed

### Production Deployment

1. **Backend Deployment:**
   - Deploy to services like Heroku, AWS, or DigitalOcean
   - Update CORS origins to include your production domain
   - Set `NODE_ENV=production`

2. **Extension Distribution:**
   - Package extension for Chrome Web Store
   - Update API endpoints to production URLs

## 🆘 Support & Contributing

If you encounter issues:

1. Check the logs in `server/logs/`
2. Verify all environment variables are set correctly
3. Ensure all required services are running
4. Check API quota usage for YouTube Data API

## 🎉 You're Ready!

Your YouTube Influencer Analyzer is now fully functional and ready to use! You have:

- ✅ Complete Chrome extension with popup and content script
- ✅ Full-stack backend with MongoDB database
- ✅ YouTube Data API integration
- ✅ Email discovery system
- ✅ Similar channel finder
- ✅ Comprehensive analytics

The system now provides all the core features of NanoInfluencer.ai for free, focused specifically on YouTube influencer analysis.

---

**Note:** This is a complete, working implementation that you can use immediately. The system includes fallback mechanisms, so it will work even without all optional API keys configured.