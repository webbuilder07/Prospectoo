const { logger } = require('../utils/logger');

class EmailService {
    constructor() {
        // Simplified email service - only searches YouTube bio
    }

    async findChannelEmail(channelData) {
        try {
            logger.info(`Searching for email in bio for: ${channelData.name || channelData.channelName}`);

            // Only search in the channel description/bio
            const email = this.extractEmailFromBio(channelData.description || '');

            if (email) {
                logger.success(`Found email in bio for ${channelData.name}: ${email}`);
            } else {
                logger.info(`No email found in bio for ${channelData.name}`);
            }

            return {
                email: email,
                businessEmail: null,
                confidence: email ? 0.9 : 0, // High confidence if found in bio
                source: email ? 'youtube_bio' : 'none',
                alternativeEmails: [],
                socialMedia: [],
                lastChecked: new Date()
            };

        } catch (error) {
            logger.error('Email discovery error:', error);
            return this.generateFallbackEmail(channelData);
        }
    }

    extractEmailFromBio(description) {
        if (!description) return null;
        
        logger.debug('Searching for emails in description:', description.substring(0, 100) + '...');
        
        // Extract emails from bio/description
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = description.match(emailRegex);
        
        if (emails && emails.length > 0) {
            logger.debug('Found potential emails:', emails);
            
            // Filter out common non-contact emails
            const filteredEmails = emails.filter(email => this.isValidContactEmail(email));
            
            if (filteredEmails.length === 0) {
                logger.debug('No valid contact emails found after filtering');
                return null;
            }
            
            // Prefer business/contact emails
            const businessEmail = filteredEmails.find(email => this.isBusinessEmail(email));
            
            const selectedEmail = businessEmail || filteredEmails[0];
            logger.debug('Selected email:', selectedEmail);
            
            return selectedEmail;
        }
        
        logger.debug('No emails found in description');
        return null;
    }

    isValidContactEmail(email) {
        // Filter out non-contact emails
        const invalidPatterns = [
            'noreply',
            'no-reply',
            'donotreply',
            'example.com',
            'test.com',
            'localhost'
        ];

        const emailLower = email.toLowerCase();
        
        // Check if email contains invalid patterns
        if (invalidPatterns.some(pattern => emailLower.includes(pattern))) {
            return false;
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return false;
        }

        // Check reasonable length
        if (email.length > 100) {
            return false;
        }

        return true;
    }

    isBusinessEmail(email) {
        const businessKeywords = [
            'business',
            'contact',
            'info',
            'hello',
            'support',
            'inquiry',
            'inquiries',
            'partnership',
            'partnerships',
            'collaboration',
            'collab',
            'media',
            'press'
        ];

        const emailLower = email.toLowerCase();
        return businessKeywords.some(keyword => emailLower.includes(keyword));
    }

    generateFallbackEmail(channelData) {
        logger.info('No email found in bio, returning empty result');
        
        return {
            email: null,
            businessEmail: null,
            confidence: 0,
            source: 'none',
            alternativeEmails: [],
            socialMedia: [],
            lastChecked: new Date()
        };
    }
}

module.exports = EmailService;