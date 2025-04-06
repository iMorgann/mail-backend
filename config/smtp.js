/**
 * SMTP Configuration
 * Manages SMTP-related settings and defaults
 */

// Default SMTP Providers
const SMTP_PROVIDERS = {
  GMAIL: {
    name: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requiresAuth: true,
    authType: 'login',
    description: 'Gmail SMTP service (requires app password for 2FA accounts)'
  },
  OUTLOOK: {
    name: 'Outlook/Office 365',
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    requiresAuth: true,
    authType: 'login',
    description: 'Microsoft Outlook and Office 365 SMTP service'
  },
  YAHOO: {
    name: 'Yahoo Mail',
    host: 'smtp.mail.yahoo.com',
    port: 587,
    secure: false,
    requiresAuth: true,
    authType: 'login',
    description: 'Yahoo Mail SMTP service'
  },
  SENDGRID: {
    name: 'SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    requiresAuth: true,
    authType: 'login',
    description: 'SendGrid SMTP service'
  },
  MAILGUN: {
    name: 'Mailgun',
    host: 'smtp.mailgun.org',
    port: 587,
    secure: false,
    requiresAuth: true,
    authType: 'login',
    description: 'Mailgun SMTP service'
  },
  CUSTOM: {
    name: 'Custom SMTP Server',
    host: '',
    port: 587,
    secure: false,
    requiresAuth: true,
    authType: 'login',
    description: 'Custom SMTP server configuration'
  }
};

// Get provider details by key
const getProviderDetails = (providerKey) => {
  return SMTP_PROVIDERS[providerKey] || SMTP_PROVIDERS.CUSTOM;
};

// Get all providers
const getAllProviders = () => {
  return Object.keys(SMTP_PROVIDERS).map(key => ({
    key,
    ...SMTP_PROVIDERS[key]
  }));
};

// Default SMTP settings from environment variables
const DEFAULT_SMTP_SETTINGS = {
  host: process.env.DEFAULT_SMTP_HOST || '',
  port: parseInt(process.env.DEFAULT_SMTP_PORT || '587', 10),
  secure: process.env.DEFAULT_SMTP_SECURE === 'true',
  auth: {
    user: process.env.DEFAULT_SMTP_USER || '',
    pass: process.env.DEFAULT_SMTP_PASS || ''
  },
  from: process.env.DEFAULT_FROM_EMAIL || '',
  fromName: process.env.DEFAULT_FROM_NAME || 'Email Service'
};

// Email delivery best practices
const BEST_PRACTICES = {
  maxRecipientsPerBatch: 50,
  recommendedRateLimit: 10, // emails per second
  recommendedSendInterval: 200, // milliseconds between emails
  maxAttachmentSize: 10 * 1024 * 1024, // 10MB
  recommendedRetryCount: 3,
  doNotUseWords: [
    'free', 'buy', 'cash', 'casino', 'prize', 'viagra', 'winner', 
    'urgent', 'act now', 'limited time', 'discount', 'sale', 'cheap'
  ]
};

module.exports = {
  SMTP_PROVIDERS,
  getProviderDetails,
  getAllProviders,
  DEFAULT_SMTP_SETTINGS,
  BEST_PRACTICES
};