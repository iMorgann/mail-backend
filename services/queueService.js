// Enhanced queueService.js with job termination and cleanup
const EventEmitter = require('events');

class MemoryQueue extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.jobs = []; // All jobs (waiting, active, completed, failed)
    this.activeJobs = new Map(); // Currently processing jobs
    this.jobCounter = 0;
    this.isShuttingDown = false; // Flag for shutdown
  }

  async add(data, options = {}) {
    // Don't add new jobs if shutting down
    if (this.isShuttingDown) {
      throw new Error('Queue is shutting down, cannot add new jobs');
    }
    
    const jobId = options.isBulk ? `bulk_${Date.now()}_${++this.jobCounter}` : `${++this.jobCounter}`;
    const job = {
      id: jobId,
      data,
      options,
      timestamp: Date.now(),
      state: 'waiting',
      _progress: 0,
      result: null,
      error: null,
      processedOn: null,
      finishedOn: null,
      canceled: false // Add canceled flag
    };

    this.jobs.push(job);
    setImmediate(() => this.emit('added', job));
    
    this.process();
    
    return job;
  }

  async getJob(jobId) {
    return this.jobs.find(job => job.id === jobId) || null;
  }

  async process(concurrency = 1, processCallback) {
    if (processCallback) {
      this.processCallback = processCallback;
    }
    
    if (!this.processCallback || this.isShuttingDown) return;
    
    const waitingJobs = this.jobs.filter(job => job.state === 'waiting' && !job.canceled);
    for (const job of waitingJobs) {
      if (this.activeJobs.size >= concurrency || this.isShuttingDown) break;
      
      this.activeJobs.set(job.id, job);
      job.state = 'active';
      job.processedOn = Date.now();
      
      setImmediate(async () => {
        try {
          // Check if job was canceled before processing
          if (job.canceled) {
            job.state = 'canceled';
            job.finishedOn = Date.now();
            this.emit('canceled', job);
            this.activeJobs.delete(job.id);
            return;
          }

          this.emit('processing', job);
          
          const result = await this.processCallback(job);
          
          // Check if job was canceled during processing
          if (job.canceled) {
            job.state = 'canceled';
            job.finishedOn = Date.now();
            this.emit('canceled', job);
          } else {
            job.state = 'completed';
            job.finishedOn = Date.now();
            job.result = result;
            job._progress = 100;
            this.emit('completed', job, result);
          }
        } catch (error) {
          job.state = job.canceled ? 'canceled' : 'failed';
          job.finishedOn = Date.now();
          job.error = error.message || 'Unknown error';
          
          this.emit(job.canceled ? 'canceled' : 'failed', job, error);
        } finally {
          this.activeJobs.delete(job.id);
          if (!this.isShuttingDown) {
            this.process();
          }
        }
      });
    }
  }

  async getState(jobId) {
    const job = await this.getJob(jobId);
    return job ? job.state : null;
  }

  async progress(jobId, progress) {
    const job = await this.getJob(jobId);
    if (job) {
      job._progress = progress;
      this.emit('progress', job, progress);
    }
    return job;
  }

  async getActive() {
    return this.jobs.filter(job => job.state === 'active');
  }

  async getWaiting() {
    return this.jobs.filter(job => job.state === 'waiting');
  }

  async getCompleted() {
    return this.jobs.filter(job => job.state === 'completed');
  }

  async getFailed() {
    return this.jobs.filter(job => job.state === 'failed');
  }

  async count() {
    return this.jobs.length;
  }

  async clean(age, state) {
    const cutoff = Date.now() - age;
    this.jobs = this.jobs.filter(job => {
      if (state && job.state !== state) return true;
      const timestamp = job.finishedOn || job.timestamp;
      return timestamp > cutoff;
    });
    return true;
  }

  async remove(jobId) {
    const jobIndex = this.jobs.findIndex(job => job.id === jobId);
    if (jobIndex !== -1) {
      const job = this.jobs[jobIndex];
      
      // If job is waiting or active, mark it as canceled
      if (job.state === 'waiting' || job.state === 'active') {
        job.canceled = true;
        job.state = job.state === 'waiting' ? 'canceled' : job.state; // Immediately mark waiting jobs as canceled
        
        console.log(`Job ${jobId} marked for cancellation`);
        this.emit('cancel-requested', job);
        
        if (job.state === 'canceled') {
          // Only remove completely if it was in waiting state
          this.jobs.splice(jobIndex, 1);
        }
        return true;
      } else {
        // For completed or failed jobs, just remove them
        this.jobs.splice(jobIndex, 1);
        this.activeJobs.delete(jobId);
        return true;
      }
    }
    return false;
  }

  // New method to stop all processing
  async shutdown() {
    console.log(`Shutting down queue: ${this.name}`);
    this.isShuttingDown = true;
    
    // Mark all waiting jobs as canceled
    for (const job of this.jobs) {
      if (job.state === 'waiting') {
        job.state = 'canceled';
        job.canceled = true;
        job.finishedOn = Date.now();
      }
    }
    
    // Request cancellation of active jobs
    for (const [jobId, job] of this.activeJobs) {
      job.canceled = true;
      this.emit('cancel-requested', job);
    }
    
    // Wait for active jobs to finish (or timeout after 10 seconds)
    if (this.activeJobs.size > 0) {
      console.log(`Waiting for ${this.activeJobs.size} active jobs to complete or cancel...`);
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (this.activeJobs.size === 0) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 10000);
      });
    }
    
    console.log(`Queue ${this.name} shutdown complete`);
    return true;
  }
}

// Queue initialization code...
const emailQueue = new MemoryQueue('email-queue');
const bulkEmailQueue = new MemoryQueue('bulk-email-queue');

// Setup email queue processing
emailQueue.on('added', () => {
  const { processEmail } = require('./emailService');
  
  emailQueue.process(5, async (job) => {
    console.log(`Processing email job ${job.id} for recipient: ${job.data.recipient}`);
    try {
      const result = await processEmail(job.data);
      console.log(`Email job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      console.error(`Error processing email job ${job.id}: ${error.message}`);
      throw error; // Ensure error propagates to set job state to 'failed'
    }
  });
});

// Setup bulk email queue processing
bulkEmailQueue.on('added', () => {
  bulkEmailQueue.process(1, async (job) => {
    console.log(`Processing bulk email job ${job.id} with ${job.data.recipients.length} recipients`);
    const { emailConfig, recipients, templateVarsArray = [] } = job.data;
    const totalRecipients = recipients.length;
    const spawnedJobIds = [];
    
    // Process emails with a concurrency limit
    const concurrencyLimit = 5;
    const batchSize = Math.min(concurrencyLimit, totalRecipients);
    
    // Utility function for processing in batches with rate limiting
    const processBatch = async (startIndex, batchSize) => {
      const batchPromises = [];
      
      for (let i = 0; i < batchSize && (startIndex + i) < totalRecipients; i++) {
        const index = startIndex + i;
        const recipient = recipients[index];
        const templateVars = index < templateVarsArray.length ? templateVarsArray[index] : {};
        
        // If job was canceled, stop processing new emails
        if (job.canceled) {
          break;
        }
        
        const emailJobPromise = emailQueue.add({
          emailConfig,
          recipient,
          templateVars,
          bulkJobId: job.id
        });
        
        batchPromises.push(emailJobPromise);
      }
      
      // Wait for all emails in this batch to be queued
      const emailJobs = await Promise.all(batchPromises);
      
      // Collect job IDs
      emailJobs.forEach(emailJob => {
        spawnedJobIds.push(emailJob.id);
      });
      
      // Update progress
      await bulkEmailQueue.progress(job.id, Math.floor((startIndex + batchPromises.length) / totalRecipients * 100));
      
      return batchPromises.length;
    };
    
    // Process all recipients in batches
    for (let startIndex = 0; startIndex < totalRecipients; startIndex += batchSize) {
      // Check if job was canceled
      if (job.canceled) {
        console.log(`Bulk job ${job.id} was canceled, stopping processing`);
        break;
      }
      
      const processed = await processBatch(startIndex, batchSize);
      if (processed === 0) break; // No more to process
      
      // Add a small delay between batches to prevent overwhelming the system
      if (startIndex + batchSize < totalRecipients) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Only wait for job completion if we weren't canceled
    if (!job.canceled) {
      // Wait for all spawned jobs to complete or fail
      let allCompleted = false;
      const maxWaitTime = 180000; // 3 minutes max wait time
      const startWaitTime = Date.now();
      
      while (!allCompleted && (Date.now() - startWaitTime < maxWaitTime)) {
        const spawnedJobs = await Promise.all(spawnedJobIds.map(id => emailQueue.getJob(id)));
        allCompleted = spawnedJobs.every(job => 
          job && (job.state === 'completed' || job.state === 'failed' || job.state === 'canceled')
        );
        
        if (!allCompleted) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
        }
      }
    }

    console.log(`Bulk email job ${job.id} completed successfully, spawned jobs: ${spawnedJobIds.join(',')}`);
    return { 
      success: true, 
      totalEmails: totalRecipients,
      message: `Created ${spawnedJobIds.length} email jobs`,
      spawnedJobIds
    };
  });
});

// Register event handlers for monitoring
emailQueue.on('completed', (job, result) => {
  console.log(`Email job ${job.id} completed successfully`);
});

emailQueue.on('failed', (job, error) => {
  console.error(`Email job ${job.id} failed: ${error.message}`);
});

emailQueue.on('canceled', (job) => {
  console.log(`Email job ${job.id} was canceled`);
});

bulkEmailQueue.on('completed', (job, result) => {
  console.log(`Bulk email job ${job.id} completed successfully, spawned jobs: ${result.spawnedJobIds?.join(',') || 'none'}`);
});

bulkEmailQueue.on('failed', (job, error) => {
  console.error(`Bulk email job ${job.id} failed: ${error.message}`);
});

bulkEmailQueue.on('canceled', (job) => {
  console.log(`Bulk email job ${job.id} was canceled`);
});

// Create a queueService object with enhanced methods
const queueService = {
  emailQueue,
  bulkEmailQueue,
  
  // For adding a new job to the email queue
  addJob: async (queueName, jobData) => {
    console.log(`Adding job to ${queueName} queue`);
    
    if (queueName === 'email') {
      if (Array.isArray(jobData.to)) {
        // Handle bulk emails
        return bulkEmailQueue.add({
          emailConfig: {
            subject: jobData.subject,
            content: jobData.content,
            attachments: jobData.attachments || []
          },
          recipients: jobData.to,
          templateVarsArray: jobData.metadata ? [jobData.metadata] : []
        }, { isBulk: true });
      } else {
        // Handle single email
        return emailQueue.add({
          emailConfig: {
            subject: jobData.subject,
            content: jobData.content,
            attachments: jobData.attachments || []
          },
          recipient: jobData.to,
          templateVars: jobData.metadata || {}
        });
      }
    } else {
      throw new Error(`Unknown queue: ${queueName}`);
    }
  },
  
  // Create a new bulk job
  createBulkJob: async (data) => bulkEmailQueue.add(data, { isBulk: true }),
  
  // Method for canceling a bulk job and its children
  cancelBulkJob: async (bulkJobId) => {
    const bulkJob = await bulkEmailQueue.getJob(bulkJobId);
    if (!bulkJob) {
      return { success: false, message: 'Bulk job not found' };
    }
    
    // First, mark the bulk job for cancellation
    const bulkCanceled = await bulkEmailQueue.remove(bulkJobId);
    
    // Then, find and cancel all child jobs
    let childJobsCanceled = 0;
    let childJobsTotal = 0;
    
    // Check both places where spawnedJobIds might be stored
    const spawnedJobIds = [];
    if (bulkJob.result && bulkJob.result.spawnedJobIds) {
      spawnedJobIds.push(...bulkJob.result.spawnedJobIds);
    }
    if (bulkJob.data && bulkJob.data.emailJobs) {
      spawnedJobIds.push(...bulkJob.data.emailJobs);
    }
    
    childJobsTotal = spawnedJobIds.length;
    
    // Cancel each child job
    for (const jobId of spawnedJobIds) {
      try {
        const canceled = await emailQueue.remove(jobId);
        if (canceled) childJobsCanceled++;
      } catch (err) {
        console.error(`Error canceling job ${jobId}:`, err);
      }
    }
    
    return {
      success: true,
      bulkJobCanceled: bulkCanceled,
      childJobsCanceled,
      childJobsTotal,
      message: `Bulk job ${bulkJobId} canceled. ${childJobsCanceled}/${childJobsTotal} child jobs canceled.`
    };
  },
  
  // Method to shutdown all queues
  shutdownAll: async () => {
    console.log('Shutting down all queues...');
    await Promise.all([
      emailQueue.shutdown(),
      bulkEmailQueue.shutdown()
    ]);
    return true;
  },
  
  // Get a job by ID from either queue
  getJob: async (jobId) => {
    let job = await emailQueue.getJob(jobId);
    if (!job) job = await bulkEmailQueue.getJob(jobId);
    return job;
  },
  
  // Get active jobs from both queues
  getActiveJobs: async (limit = 100, skip = 0) => {
    const [emailActive, emailWaiting, emailCompleted, emailFailed, bulkActive, bulkWaiting, bulkCompleted, bulkFailed] = await Promise.all([
      emailQueue.getActive(),
      emailQueue.getWaiting(),
      emailQueue.getCompleted(),
      emailQueue.getFailed(),
      bulkEmailQueue.getActive(),
      bulkEmailQueue.getWaiting(),
      bulkEmailQueue.getCompleted(),
      bulkEmailQueue.getFailed()
    ]);
    
    const allJobs = [
      ...emailActive,
      ...emailWaiting,
      ...emailCompleted,
      ...emailFailed,
      ...bulkActive,
      ...bulkWaiting,
      ...bulkCompleted,
      ...bulkFailed
    ].sort((a, b) => b.timestamp - a.timestamp);
    
    return allJobs.slice(skip, skip + limit);
  },
  
  // Get total job count
  getJobCount: async () => {
    const [emailCount, bulkCount] = await Promise.all([
      emailQueue.count(),
      bulkEmailQueue.count()
    ]);
    return emailCount + bulkCount;
  },
  
  // Clean old jobs from both queues
  cleanOldJobs: async (age = 7 * 24 * 60 * 60 * 1000) => {
    await emailQueue.clean(age, 'completed');
    await emailQueue.clean(age, 'failed');
    await bulkEmailQueue.clean(age, 'completed');
    await bulkEmailQueue.clean(age, 'failed');
  },
  
  // Remove a job from either queue
  removeJob: async (jobId) => {
    const removedFromEmail = await emailQueue.remove(jobId);
    if (removedFromEmail) return true;
    return await bulkEmailQueue.remove(jobId);
  }
};

// Export the service
module.exports = queueService;