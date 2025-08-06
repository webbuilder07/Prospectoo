const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/youtube-analyzer';
        
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false,
            bufferMaxEntries: 0
        };

        const conn = await mongoose.connect(mongoURI, options);
        
        logger.info(`📀 MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
        
        // Handle connection events
        mongoose.connection.on('connected', () => {
            logger.info('🔗 MongoDB connection established');
        });
        
        mongoose.connection.on('error', (err) => {
            logger.error('❌ MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            logger.warn('⚠️ MongoDB disconnected');
        });
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('💀 MongoDB connection closed through app termination');
            process.exit(0);
        });
        
    } catch (error) {
        logger.error('❌ MongoDB connection failed:', error.message);
        
        // For development, continue without database
        if (process.env.NODE_ENV === 'development') {
            logger.warn('⚠️ Running in development mode without database');
            return;
        }
        
        process.exit(1);
    }
};

module.exports = connectDB;