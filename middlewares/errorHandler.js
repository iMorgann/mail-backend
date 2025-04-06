/**
 * Error logger - logs errors to console and potentially to a monitoring service
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 */
const logError = (err, req) => {
  // Log basic error info
  console.error(`[ERROR] ${err.name}: ${err.message}`);
  
  // Log request details
  console.error(`Request: ${req.method} ${req.originalUrl}`);
  
  // Log request IP and user agent
  console.error(`IP: ${req.ip}, User-Agent: ${req.get('user-agent')}`);
  
  // Log stack trace
  if (err.stack) {
    console.error('Stack:', err.stack);
  }
  
  // In a production app, you would send this to a monitoring service
  // like Sentry, New Relic, etc.
};

/**
 * Not Found (404) handler
 */
const notFoundHandler = (req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  
  // Log the error
  logError(err, req);
  
  // Determine if we're in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Prepare error response
  const errorResponse = {
    error: status === 404 ? 'Not Found' : 'Server Error',
    message: status === 404 ? 'The requested resource was not found' : 'An unexpected error occurred'
  };
  
  // Add more details if not in production
  if (!isProduction) {
    errorResponse.actualError = err.message;
    errorResponse.stack = err.stack;
  }
  
  // Send error response
  res.status(status).json(errorResponse);
};

module.exports = {
  notFoundHandler,
  errorHandler
};