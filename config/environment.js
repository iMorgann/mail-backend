/**
 * Environment configuration
 * Loads and validates environment variables
 */

// Port for the server to listen on
const PORT = process.env.PORT || 5000;

// Node environment
const NODE_ENV = process.env.NODE_ENV || 'development';

// Job retention period (in milliseconds)
const JOB_RETENTION_PERIOD = parseInt(process.env.JOB_RETENTION_PERIOD || (7 * 24 * 60 * 60 * 1000), 10); // 7 days

// Rate limits
const EMAIL_RATE_LIMIT = parseInt(process.env.EMAIL_RATE_LIMIT || 5, 10); // 5 emails per second
const API_RATE_LIMIT = parseInt(process.env.API_RATE_LIMIT || 100, 10); // 100 requests per 15 minutes

// Maximum email size (in bytes)
const MAX_EMAIL_SIZE = parseInt(process.env.MAX_EMAIL_SIZE || (10 * 1024 * 1024), 10); // 10MB

// Queue settings
const QUEUE_CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY || 5, 10); // 5 concurrent jobs
const QUEUE_INTERVAL = parseInt(process.env.QUEUE_INTERVAL || 100, 10); // 100ms between jobs

// Default SMTP settings (for testing)
const DEFAULT_SMTP_CONFIG = {
  host: process.env.DEFAULT_SMTP_HOST,
  port: process.env.DEFAULT_SMTP_PORT || 587,
  secure: process.env.DEFAULT_SMTP_SECURE === 'true',
  auth: {
    user: process.env.DEFAULT_SMTP_USER,
    pass: process.env.DEFAULT_SMTP_PASS
  }
};

// Check if critical environment variables are set
const validateEnvironment = () => {
  const warnings = [];
  
  if (NODE_ENV === 'production') {
    // Add production checks here if needed
    if (QUEUE_CONCURRENCY > 10) {
      warnings.push('High QUEUE_CONCURRENCY might cause performance issues in production');
    }
  }
  
  // Log warnings
  if (warnings.length > 0) {
    console.warn('Environment configuration warnings:');
    warnings.forEach(warning => console.warn(`- ${warning}`));
  }
};

// Display queue mode
console.log('Using in-memory queue system');
console.log(`Queue concurrency: ${QUEUE_CONCURRENCY}`);

// Validate on module load
validateEnvironment();

module.exports = {
  PORT,
  NODE_ENV,
  JOB_RETENTION_PERIOD,
  EMAIL_RATE_LIMIT,
  API_RATE_LIMIT,
  MAX_EMAIL_SIZE,
  QUEUE_CONCURRENCY,
  QUEUE_INTERVAL,
  DEFAULT_SMTP_CONFIG,
  validateEnvironment // Exported for testing
};