/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  // Simple email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate SMTP configuration
 * @param {Object} config - SMTP configuration
 * @returns {Object} - Validation result with errors if any
 */
const validateSmtpConfig = (config) => {
  const errors = [];
  
  if (!config) {
    return { valid: false, errors: ['SMTP configuration is required'] };
  }
  
  // Check required fields
  if (!config.smtpServer) {
    errors.push('SMTP server is required');
  }
  
  if (!config.smtpPort) {
    errors.push('SMTP port is required');
  } else if (isNaN(parseInt(config.smtpPort, 10))) {
    errors.push('SMTP port must be a number');
  }
  
  if (!config.username) {
    errors.push('Username is required');
  }
  
  if (!config.smtpPassword) {
    errors.push('Password is required');
  }
  
  if (!config.fromName) {
    errors.push('From name is required');
  }
  
  if (!config.fromEmail) {
    errors.push('From email is required');
  } else if (!validateEmail(config.fromEmail)) {
    errors.push('From email is invalid');
  }
  
  // Check reply-to format if provided
  if (config.replyTo && !validateEmail(config.replyTo)) {
    errors.push('Reply-To email is invalid');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize HTML content to prevent XSS
 * @param {string} html - HTML content to sanitize
 * @returns {string} - Sanitized HTML
 */
const sanitizeHtml = (html) => {
  if (!html) return '';
  
  // In a real application, use a proper HTML sanitizer library
  // This is a very basic implementation for demonstration
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/on\w+='[^']*'/g, '')
    .replace(/on\w+=\w+/g, '');
};

/**
 * Check if value is a valid JSON string
 * @param {string} value - Value to check
 * @returns {boolean} - True if valid JSON
 */
const isValidJson = (value) => {
  try {
    JSON.parse(value);
    return true;
  } catch (e) {
    return false;
  }
};

module.exports = {
  validateEmail,
  validateSmtpConfig,
  sanitizeHtml,
  isValidJson
};