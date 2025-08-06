// YouTube Influencer Analyzer - Backend Server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import custom modules
const connectDB = require('./config/database');
const analyticsRoutes = require('./routes/analytics');
const emailRoutes = require('./routes/email');
const channelRoutes = require('./routes/channels');
const similarRoutes = require('./routes/similar');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const webhookRoutes = require('./routes/webhooks');
const { errorHandler, notFound } = require('./middleware/errorHandlers');
const { logger } = require('./utils/logger');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https:", "http:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000',
        'chrome-extension://*',
        'moz-extension://*'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// General middleware
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/similar', similarRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhookRoutes);

// Main API endpoints for extension
app.post('/api/analyze-channel', async (req, res) => {
    try {
        const { channelId, channelHandle, channelName, subscriberCount, avatarUrl, url } = req.body;
        
        logger.info(`Analyzing channel: ${channelName || channelHandle || channelId}`);
        
        // Import analytics service
        const AnalyticsService = require('./services/analyticsService');
        const analyticsService = new AnalyticsService();
        
        // Perform comprehensive channel analysis
        const analysisData = await analyticsService.analyzeChannel({
            channelId,
            channelHandle,
            channelName,
            subscriberCount,
            avatarUrl,
            url
        });
        
        res.json({
            success: true,
            data: analysisData,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Channel analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze channel',
            message: error.message
        });
    }
});

app.post('/api/find-email', async (req, res) => {
    try {
        const channelData = req.body;
        
        logger.info(`Finding email for channel: ${channelData.name || channelData.channelName}`);
        
        // Import email service
        const EmailService = require('./services/emailService');
        const emailService = new EmailService();
        
        // Find channel email
        const emailData = await emailService.findChannelEmail(channelData);
        
        res.json({
            success: true,
            data: emailData,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Email finding error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to find email',
            message: error.message
        });
    }
});

app.post('/api/similar-channels', async (req, res) => {
    try {
        const channelData = req.body;
        
        logger.info(`Finding similar channels for: ${channelData.name || channelData.channelName}`);
        
        // Import similarity service
        const SimilarityService = require('./services/similarityService');
        const similarityService = new SimilarityService();
        
        // Find similar channels
        const similarChannels = await similarityService.findSimilarChannels(channelData);
        
        res.json({
            success: true,
            data: {
                channels: similarChannels,
                algorithm: 'content-based-filtering',
                confidence: 0.85
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Similar channels error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to find similar channels',
            message: error.message
        });
    }
});

app.post('/api/save-channel', async (req, res) => {
    try {
        const channelData = req.body;
        
        logger.info(`Saving channel: ${channelData.channelInfo?.name || 'Unknown'}`);
        
        // Import channel service
        const ChannelService = require('./services/channelService');
        const channelService = new ChannelService();
        
        // Save channel to database
        const savedChannel = await channelService.saveChannel(channelData);
        
        res.json({
            success: true,
            data: savedChannel,
            message: 'Channel saved successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Channel save error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save channel',
            message: error.message
        });
    }
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        title: 'YouTube Influencer Analyzer API',
        version: '1.0.0',
        description: 'REST API for YouTube influencer analysis and management',
        endpoints: {
            'POST /api/analyze-channel': 'Analyze a YouTube channel and get comprehensive metrics',
            'POST /api/find-email': 'Find contact email for a YouTube channel',
            'POST /api/similar-channels': 'Find similar channels using AI algorithms',
            'POST /api/save-channel': 'Save channel data to database',
            'GET /api/channels': 'Get saved channels with filtering and pagination',
            'GET /api/dashboard/stats': 'Get dashboard statistics',
            'GET /health': 'Health check endpoint'
        },
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
        }
    });
});

// Catch 404 and forward to error handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    logger.info(`🚀 YouTube Influencer Analyzer API running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    logger.info(`📖 API docs: http://localhost:${PORT}/api/docs`);
});

module.exports = app;