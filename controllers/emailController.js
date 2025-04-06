const emailService = require('../services/emailService');
const queueService = require('../services/queueService');
const emailModel = require('../models/email');
const { validateEmail, validateSmtpConfig } = require('../utils/validation');

/**
 * Send a single email
 */
const sendSingleEmail = async (req, res) => {
  try {
    const { emailConfig, recipient, templateVars } = req.body;
    
    // Validate required fields
    if (!emailConfig || !recipient) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate SMTP configuration
    const smtpValidation = validateSmtpConfig(emailConfig);
    if (!smtpValidation.valid) {
      return res.status(400).json({ 
        error: 'Invalid SMTP configuration', 
        details: smtpValidation.errors 
      });
    }

    // Validate email address
    if (!validateEmail(recipient)) {
      return res.status(400).json({ error: 'Invalid recipient email address' });
    }

    // Add to queue and get job ID
    const job = await emailService.sendEmail({
      emailConfig,
      recipient,
      templateVars
    });

    // Store email in the model for tracking
    emailModel.storeSentEmail({
      jobId: job.id,
      recipient,
      subject: emailConfig.subject,
      fromEmail: emailConfig.fromEmail,
      fromName: emailConfig.fromName,
      messageType: emailConfig.messageType,
      queuedAt: new Date().toISOString()
    });

    // Return jobId for tracking
    return res.status(200).json({ 
      success: true, 
      message: 'Email queued successfully', 
      jobId: job.id,
      status: job.state || 'queued'
    });
  } catch (error) {
    console.error('Error in sendSingleEmail:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Send emails in bulk
 */
const sendBulkEmails = async (req, res) => {
  try {
    console.log('Received bulk email request with body:', JSON.stringify(req.body, null, 2));
    
    const { emailConfig, recipients, templateVarsArray } = req.body;
    
    // Validate required fields
    if (!emailConfig) {
      return res.status(400).json({ error: 'Email configuration is required' });
    }
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients array is required and cannot be empty' });
    }
    
    // Check if subject and content are provided (could be in emailConfig or at the top level)
    const subject = emailConfig.subject;
    const content = emailConfig.content || emailConfig.message; // Accept either "content" or "message"
    
    if (!subject) {
      return res.status(400).json({ error: 'Subject is required in emailConfig' });
    }
    
    if (!content) {
      return res.status(400).json({ error: 'Content/message is required in emailConfig' });
    }
    
    // Ensure emailConfig has consistent field names
    const normalizedEmailConfig = {
      ...emailConfig,
      subject,
      content
    };
    
    try {
      // Create the bulk job
      const bulkJob = await queueService.createBulkJob({
        emailConfig: normalizedEmailConfig,
        recipients,
        templateVarsArray: templateVarsArray || []
      });
      
      console.log(`Created bulk job with ID: ${bulkJob.id}`);
      
      return res.status(200).json({
        success: true,
        message: `Bulk email job created with ${recipients.length} recipients`,
        jobId: bulkJob.id,
        total: recipients.length
      });
    } catch (error) {
      console.error('Error creating bulk job:', error);
      return res.status(500).json({ error: error.message || 'Failed to create bulk job' });
    }
  } catch (error) {
    console.error('Error in sendBulkEmails:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get all active jobs
 */
const getActiveJobs = async (req, res) => {
  try {
    const jobs = await queueService.getActiveJobs();
    const jobStatus = jobs.map(job => ({
      jobId: job.id,
      state: job.state,
      progress: job._progress,
      data: job.data,
      processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
    }));
    return res.status(200).json(jobStatus);
  } catch (error) {
    console.error('Error in getActiveJobs:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Cancel a job
 */
const cancelJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const job = await queueService.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if job can be cancelled based on its state
    if (job.state === 'completed' || job.state === 'failed' || job.state === 'canceled') {
      return res.status(400).json({ 
        error: 'Cannot cancel job', 
        reason: `Job is already in ${job.state} state` 
      });
    }

    // Remove job from queue
    const removed = await queueService.removeJob(jobId);

    return res.status(200).json({
      success: removed,
      message: removed ? 'Job cancelled successfully' : 'Failed to cancel job',
      jobId,
      previousState: job.state
    });
  } catch (error) {
    console.error('Error in cancelJob:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Validate email configuration
 */
const validateEmailConfig = async (req, res) => {
  try {
    const { emailConfig } = req.body;
    
    if (!emailConfig) {
      return res.status(400).json({ error: 'Email configuration is required' });
    }

    // Validate SMTP config format
    const validation = validateSmtpConfig(emailConfig);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SMTP configuration',
        errors: validation.errors
      });
    }

    // Test connection
    const result = await emailService.testConnection(emailConfig);
    
    return res.status(200).json({
      success: result.success,
      message: result.message,
      details: result.details || null
    });
  } catch (error) {
    console.error('Error in validateEmailConfig:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * Get email statistics
 */
const getEmailStats = async (req, res) => {
  try {
    const stats = emailModel.getStatistics();
    
    // Get queue stats
    const [emailQueueCount, bulkQueueCount] = await Promise.all([
      queueService.emailQueue.count(),
      queueService.bulkEmailQueue.count()
    ]);
    
    // Combine stats
    const combinedStats = {
      ...stats,
      queued: {
        single: emailQueueCount,
        bulk: bulkQueueCount,
        total: emailQueueCount + bulkQueueCount
      }
    };
    
    return res.status(200).json(combinedStats);
  } catch (error) {
    console.error('Error in getEmailStats:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get recent emails
 */
const getRecentEmails = async (req, res) => {
  try {
    const { status = 'all', limit = 100 } = req.query;
    const limitNum = parseInt(limit, 10);
    
    const emails = emailModel.getRecentEmails(status, limitNum);
    
    return res.status(200).json({
      emails,
      count: emails.length
    });
  } catch (error) {
    console.error('Error in getRecentEmails:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get the status of a specific job
 */
const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    console.log(`Getting status for job: ${jobId}`);
    
    const job = await queueService.getJob(jobId);
    if (!job) {
      console.log(`Job not found: ${jobId}`);
      return res.status(404).json({ error: 'Job not found' });
    }

    // Determine if this is a bulk job or individual email job
    const isBulkJob = job.id.toString().startsWith('bulk_');
    const status = {
      jobId: job.id,
      state: job.state,
      progress: job._progress,
      data: job.data,
      processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      result: job.result || {},
      error: job.error,
    };

    // For bulk jobs, make sure spawnedJobIds is included
    if (isBulkJob) {
      // Check both places where spawnedJobIds might be stored
      if (job.result && job.result.spawnedJobIds) {
        status.spawnedJobIds = job.result.spawnedJobIds;
      } else if (job.data && job.data.emailJobs) {
        status.spawnedJobIds = job.data.emailJobs;
      }
    }

    console.log(`Returning job status for ${jobId}:`, status);
    return res.status(200).json(status);
  } catch (error) {
    console.error('Error in getJobStatus:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Cancel a bulk job and all its child jobs
 */
const cancelBulkOperation = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    console.log(`Canceling bulk operation: ${jobId}`);
    
    // Call the cancelBulkJob method in queueService
    const result = await queueService.cancelBulkJob(jobId);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
        details: {
          bulkJobCanceled: result.bulkJobCanceled,
          childJobsCanceled: result.childJobsCanceled,
          childJobsTotal: result.childJobsTotal
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error in cancelBulkOperation:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Shutdown the email service (for graceful server shutdown)
 */
const shutdownService = async (req, res) => {
  try {
    console.log('Shutting down email service...');
    
    // Call the shutdownAll method in queueService
    await queueService.shutdownAll();
    
    return res.status(200).json({
      success: true,
      message: 'Email service shutdown successfully'
    });
  } catch (error) {
    console.error('Error in shutdownService:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  sendSingleEmail,
  sendBulkEmails,
  getJobStatus,
  getActiveJobs,
  cancelJob,
  validateEmailConfig,
  getEmailStats,
  getRecentEmails,
  cancelBulkOperation,
  shutdownService
};