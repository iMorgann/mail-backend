const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { emailLimiter, bulkEmailLimiter } = require('../middlewares/rateLimiter');

/**
 * @route POST /api/email/send
 * @desc Send a single email
 * @access Public
 */
router.post('/send', emailLimiter, emailController.sendSingleEmail);

/**
 * @route POST /api/email/bulk
 * @desc Send emails in bulk
 * @access Public
 */
router.post('/bulk', bulkEmailLimiter, emailController.sendBulkEmails);

/**
 * @route GET /api/email/status/:jobId
 * @desc Get status of email job
 * @access Public
 */
router.get('/status/:jobId', emailController.getJobStatus);

/**
 * @route GET /api/email/jobs
 * @desc Get all active email jobs
 * @access Public
 */
router.get('/jobs', emailController.getActiveJobs);

/**
 * @route DELETE /api/email/jobs/:jobId
 * @desc Cancel a job
 * @access Public
 */
router.delete('/jobs/:jobId', emailController.cancelJob);

/**
 * @route POST /api/email/cancel/:jobId
 * @desc Cancel a bulk email operation and all its child jobs
 * @access Public
 */
router.post('/cancel/:jobId', emailController.cancelBulkOperation);

/**
 * @route POST /api/email/validate
 * @desc Validate email configuration
 * @access Public
 */
router.post('/validate', emailController.validateEmailConfig);

/**
 * @route GET /api/email/stats
 * @desc Get email statistics
 * @access Public
 */
router.get('/stats', emailController.getEmailStats);

/**
 * @route GET /api/email/recent
 * @desc Get recent emails
 * @access Public
 */
router.get('/recent', emailController.getRecentEmails);

/**
 * @route POST /api/email/shutdown
 * @desc Gracefully shutdown the email service
 * @access Private
 */
router.post('/shutdown', emailController.shutdownService);

module.exports = router;