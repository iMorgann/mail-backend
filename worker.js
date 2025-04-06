/**
 * Email processing worker
 * Separate process for handling email queue jobs
 */
const dotenv = require('dotenv');
dotenv.config();

// Import services
const { emailQueue, bulkEmailQueue, cleanOldJobs } = require('./services/queueService');
// Import processEmail directly from emailService to avoid circular dependency
const emailService = require('./services/emailService');
const { JOB_RETENTION_PERIOD } = require('./config/environment');

console.log('Starting email worker process...');

// Set up better error handling for the worker
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Keep the process running despite the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep the process running despite the rejection
});

// Process individual emails
emailQueue.process(async (job) => {
  try {
    console.log(`Processing email job ${job.id} for recipient: ${job.data.recipient}`);
    // Use emailService.processEmail directly
    const result = await emailService.processEmail(job.data);
    console.log(`Email job ${job.id} completed successfully`);
    return result;
  } catch (error) {
    console.error(`Error processing email job ${job.id}:`, error);
    throw error; // Rethrow to trigger job failure
  }
});

// Process bulk email jobs
bulkEmailQueue.process(async (job) => {
  try {
    console.log(`Processing bulk email job ${job.id} with ${job.data.recipients.length} recipients`);
    const { emailConfig, recipients, templateVarsArray = [] } = job.data;
    const totalRecipients = recipients.length;
    
    // Create child jobs (one per recipient)
    for (let i = 0; i < totalRecipients; i++) {
      const recipient = recipients[i];
      const templateVars = i < templateVarsArray.length ? templateVarsArray[i] : {};
      
      // Create a job for this recipient
      await emailQueue.add({
        emailConfig,
        recipient,
        templateVars
      });
      
      // Update progress
      await job.progress(Math.floor((i + 1) / totalRecipients * 100));
      
      // Add a small delay to prevent overwhelming the queue
      if (i < totalRecipients - 1 && i % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Bulk email job ${job.id} completed successfully`);
    return { 
      success: true, 
      totalEmails: totalRecipients,
      message: `Created ${totalRecipients} email jobs`
    };
  } catch (error) {
    console.error(`Error processing bulk email job ${job.id}:`, error);
    throw error;
  }
});

// Listen for completed jobs
emailQueue.on('completed', (job, result) => {
  console.log(`Email to ${result.recipient} completed with message ID: ${result.messageId}`);
});

// Listen for failed jobs
emailQueue.on('failed', (job, error) => {
  console.error(`Email job ${job.id} failed:`, error);
});

bulkEmailQueue.on('completed', (job, result) => {
  console.log(`Bulk job ${job.id} completed, created ${result.totalEmails} email jobs`);
});

bulkEmailQueue.on('failed', (job, error) => {
  console.error(`Bulk email job ${job.id} failed:`, error);
});

// Set up periodic job cleaning
const CLEAN_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

setInterval(async () => {
  try {
    console.log('Running scheduled job cleanup...');
    await cleanOldJobs(JOB_RETENTION_PERIOD);
    console.log('Job cleanup completed');
  } catch (error) {
    console.error('Error during job cleanup:', error);
  }
}, CLEAN_INTERVAL);

console.log('Email worker is running and ready to process jobs');

// Keep the process alive
process.stdin.resume();