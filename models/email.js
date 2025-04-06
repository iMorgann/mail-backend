/**
 * Email Model
 * 
 * Simple in-memory storage for email data.
 * In a production application, you would replace this with a database model.
 * Options include MongoDB, PostgreSQL, MySQL, etc.
 */

// In-memory store for emails
const emailStore = {
  sent: [],
  failed: []
};

// Get maximum ID from the store
const getMaxId = () => {
  const sentMax = emailStore.sent.length > 0 
    ? Math.max(...emailStore.sent.map(email => email.id)) 
    : 0;
  
  const failedMax = emailStore.failed.length > 0 
    ? Math.max(...emailStore.failed.map(email => email.id)) 
    : 0;
  
  return Math.max(sentMax, failedMax, 0);
};

/**
 * Store a successfully sent email
 * @param {Object} emailData - Email data
 * @returns {Object} - Stored email with ID
 */
const storeSentEmail = (emailData) => {
  const email = {
    id: getMaxId() + 1,
    ...emailData,
    status: 'sent',
    sentAt: new Date().toISOString()
  };
  
  emailStore.sent.push(email);
  
  // Limit the size of the store to prevent memory issues
  if (emailStore.sent.length > 1000) {
    emailStore.sent = emailStore.sent.slice(-1000);
  }
  
  return email;
};

/**
 * Store a failed email
 * @param {Object} emailData - Email data
 * @param {string} error - Error message
 * @returns {Object} - Stored email with ID
 */
const storeFailedEmail = (emailData, error) => {
  const email = {
    id: getMaxId() + 1,
    ...emailData,
    status: 'failed',
    error,
    failedAt: new Date().toISOString()
  };
  
  emailStore.failed.push(email);
  
  // Limit the size of the store
  if (emailStore.failed.length > 1000) {
    emailStore.failed = emailStore.failed.slice(-1000);
  }
  
  return email;
};

/**
 * Get recent emails
 * @param {string} status - 'sent', 'failed', or 'all'
 * @param {number} limit - Maximum number of emails to return
 * @returns {Array} - Array of emails
 */
const getRecentEmails = (status = 'all', limit = 100) => {
  if (status === 'sent') {
    return emailStore.sent.slice(-limit).reverse();
  }
  
  if (status === 'failed') {
    return emailStore.failed.slice(-limit).reverse();
  }
  
  // All emails, sorted by most recent first
  return [...emailStore.sent, ...emailStore.failed]
    .sort((a, b) => {
      const dateA = new Date(a.sentAt || a.failedAt);
      const dateB = new Date(b.sentAt || b.failedAt);
      return dateB - dateA;
    })
    .slice(0, limit);
};

/**
 * Get email by ID
 * @param {number} id - Email ID
 * @returns {Object|null} - Email or null if not found
 */
const getEmailById = (id) => {
  const parsedId = parseInt(id, 10);
  
  const sentEmail = emailStore.sent.find(email => email.id === parsedId);
  if (sentEmail) return sentEmail;
  
  const failedEmail = emailStore.failed.find(email => email.id === parsedId);
  if (failedEmail) return failedEmail;
  
  return null;
};

/**
 * Get email statistics
 * @returns {Object} - Email statistics
 */
const getStatistics = () => {
  return {
    sent: emailStore.sent.length,
    failed: emailStore.failed.length,
    total: emailStore.sent.length + emailStore.failed.length,
    lastSent: emailStore.sent.length > 0 
      ? emailStore.sent[emailStore.sent.length - 1].sentAt 
      : null,
    lastFailed: emailStore.failed.length > 0 
      ? emailStore.failed[emailStore.failed.length - 1].failedAt 
      : null
  };
};

/**
 * Clear email store
 * @param {string} status - 'sent', 'failed', or 'all'
 */
const clearEmails = (status = 'all') => {
  if (status === 'sent') {
    emailStore.sent = [];
  } else if (status === 'failed') {
    emailStore.failed = [];
  } else {
    emailStore.sent = [];
    emailStore.failed = [];
  }
};

module.exports = {
  storeSentEmail,
  storeFailedEmail,
  getRecentEmails,
  getEmailById,
  getStatistics,
  clearEmails
};