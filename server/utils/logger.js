const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);
        this.errorFile = path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);
    }

    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') : '';
        
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
    }

    writeToFile(filename, message) {
        try {
            fs.appendFileSync(filename, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    info(message, ...args) {
        const formatted = this.formatMessage('info', message, ...args);
        console.log(`\x1b[36m${formatted}\x1b[0m`); // Cyan
        this.writeToFile(this.logFile, formatted);
    }

    warn(message, ...args) {
        const formatted = this.formatMessage('warn', message, ...args);
        console.warn(`\x1b[33m${formatted}\x1b[0m`); // Yellow
        this.writeToFile(this.logFile, formatted);
    }

    error(message, ...args) {
        const formatted = this.formatMessage('error', message, ...args);
        console.error(`\x1b[31m${formatted}\x1b[0m`); // Red
        this.writeToFile(this.logFile, formatted);
        this.writeToFile(this.errorFile, formatted);
    }

    debug(message, ...args) {
        if (process.env.NODE_ENV === 'development') {
            const formatted = this.formatMessage('debug', message, ...args);
            console.log(`\x1b[35m${formatted}\x1b[0m`); // Magenta
            this.writeToFile(this.logFile, formatted);
        }
    }

    success(message, ...args) {
        const formatted = this.formatMessage('success', message, ...args);
        console.log(`\x1b[32m${formatted}\x1b[0m`); // Green
        this.writeToFile(this.logFile, formatted);
    }
}

const logger = new Logger();

module.exports = { logger };