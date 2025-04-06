// middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Global API rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  },
  skip: (req) => {
    // Skip rate limiting for specific routes or conditions
    return req.path === '/health';
  }
});

// Email sending rate limiter
const emailLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 email sends per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many email requests',
    message: 'Please try again later'
  }
});

// Bulk email rate limiter
const bulkEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 bulk email requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many bulk email requests',
    message: 'Please try again later'
  }
});

module.exports = {
  globalLimiter,
  emailLimiter,
  bulkEmailLimiter
};