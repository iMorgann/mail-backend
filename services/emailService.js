const nodemailer = require('nodemailer');
const { applyTemplateVars } = require('../utils/templating');

/**
 * Add an email to the sending queue
 * @param {Object} emailData - Email data (emailConfig, recipient, templateVars)
 * @returns {Promise<Object>} - Job object
 */
const sendEmail = async (emailData) => {
  // Import here to avoid circular dependency
  const { emailQueue } = require('./queueService');
  
  // Add job to queue with retry options
  return emailQueue.add(emailData, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: false, // Keep completed jobs for status checking
    removeOnFail: false // Keep failed jobs for debugging
  });
};

/**
 * Process an email from the queue
 * @param {Object} data - Job data from the queue
 * @returns {Promise<Object>} - Result of email sending
 */
const processEmail = async (data) => {
  const { emailConfig, recipient, templateVars } = data;
  
  try {
    // Create SMTP transport
    const transporter = createTransporter(emailConfig);
    
    // Apply template variables
    const personalizedMessage = applyTemplateVars(emailConfig.message, templateVars);
    const personalizedSubject = applyTemplateVars(emailConfig.subject, templateVars);
    
    // Set content based on message type
    const mailOptions = {
      from: `${emailConfig.fromName} <${emailConfig.fromEmail}>`,
      to: recipient,
      subject: personalizedSubject,
      replyTo: emailConfig.replyTo || emailConfig.fromEmail,
      headers: getEmailHeaders(emailConfig)
    };
    
    // Set either HTML or text content
    if (emailConfig.messageType === 'html') {
      mailOptions.html = personalizedMessage;
      // Create a plain text version as fallback
      mailOptions.text = htmlToText(personalizedMessage);
    } else {
      mailOptions.text = personalizedMessage;
    }
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
      recipient,
      response: info.response
    };
  } catch (error) {
    console.error(`Error sending email to ${recipient}:`, error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Create nodemailer transport with SMTP settings
 * @param {Object} emailConfig - SMTP configuration
 * @returns {Object} - Nodemailer transporter
 */
const createTransporter = (emailConfig) => {
  return nodemailer.createTransport({
    host: emailConfig.smtpServer,
    port: parseInt(emailConfig.smtpPort, 10),
    secure: emailConfig.smtpPort === "465" || emailConfig.smtpPort === 465,
    auth: {
      user: emailConfig.username,
      pass: emailConfig.smtpPassword,
    },
    pool: true, // Use connection pool
    maxConnections: 5,
    rateDelta: 1000,
    rateLimit: parseInt(emailConfig.rateLimit, 10) || 5, // Default limit of 5 emails per second
    tls: {
      rejectUnauthorized: false, // In production, consider setting to true
      ciphers: 'SSLv3'
    }
  });
};

/**
 * Get email headers for better deliverability
 * @param {Object} emailConfig - Email configuration
 * @returns {Object} - Headers object
 */
const getEmailHeaders = (emailConfig) => {
  const domain = emailConfig.fromEmail.split('@')[1];
  
  return {
    'X-Priority': '3',
    'X-MSMail-Priority': 'Normal',
    'Importance': 'Normal',
    'X-Mailer': 'Modern-Email-Service',
    'List-Unsubscribe': `<mailto:unsubscribe@${domain}?subject=unsubscribe>`,
    'Message-ID': `<${Math.random().toString(36).substring(2)}@${domain}>`
  };
};

/**
 * Simple HTML to text conversion (for fallback plain text)
 * @param {string} html - HTML content
 * @returns {string} - Plain text version
 */
const htmlToText = (html) => {
  return html
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
};

/**
 * Test SMTP connection
 * @param {Object} emailConfig - SMTP configuration
 * @returns {Promise<Object>} - Connection test result
 */
const testConnection = async (emailConfig) => {
  try {
    const transporter = createTransporter(emailConfig);
    
    // Verify connection
    const result = await transporter.verify();
    
    if (result) {
      return {
        success: true,
        message: 'SMTP connection successful'
      };
    } else {
      return {
        success: false,
        message: 'SMTP connection failed'
      };
    }
  } catch (error) {
    console.error('SMTP connection test failed:', error);
    return {
      success: false,
      message: 'SMTP connection failed',
      details: error.message
    };
  }
};

module.exports = {
  sendEmail,
  processEmail,
  testConnection,
  createTransporter // Exported for testing
};