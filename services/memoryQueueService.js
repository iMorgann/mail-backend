// services/memoryQueueService.js
const EventEmitter = require('events');

class MemoryQueue extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.jobs = [];
    this.activeJobs = new Map();
    this.jobCounter = 0;
  }

  // Add a job to the queue
  async add(data, options = {}) {
    const jobId = ++this.jobCounter;
    const job = {
      id: jobId.toString(),
      data,
      options,
      timestamp: Date.now(),
      state: 'waiting',
      _progress: 0,
      result: null,
      error: null,
      processedOn: null,
      finishedOn: null
    };

    this.jobs.push(job);
    setImmediate(() => this.emit('added', job));
    
    // Start processing
    this.process();
    
    return job;
  }

  // Get a job by ID
  async getJob(jobId) {
    return this.jobs.find(job => job.id === jobId) || null;
  }

  // Process jobs (needs to be set by processCallback)
  async process(concurrency = 1, processCallback) {
    if (processCallback) {
      this.processCallback = processCallback;
    }
    
    if (!this.processCallback) return;
    
    const waitingJobs = this.jobs.filter(job => job.state === 'waiting');
    for (const job of waitingJobs) {
      if (this.activeJobs.size >= concurrency) break;
      
      this.activeJobs.set(job.id, job);
      job.state = 'active';
      job.processedOn = Date.now();
      
      // Process the job asynchronously
      setImmediate(async () => {
        try {
          this.emit('processing', job);
          
          // Call the process callback
          const result = await this.processCallback(job);
          
          job.state = 'completed';
          job.finishedOn = Date.now();
          job.result = result;
          
          this.emit('completed', job, result);
        } catch (error) {
          job.state = 'failed';
          job.finishedOn = Date.now();
          job.error = error.message;
          
          this.emit('failed', job, error);
        } finally {
          this.activeJobs.delete(job.id);
          // Continue processing more jobs
          this.process();
        }
      });
    }
  }

  // Get job state
  async getState(jobId) {
    const job = await this.getJob(jobId);
    return job ? job.state : null;
  }

  // Update job progress
  async progress(jobId, progress) {
    const job = await this.getJob(jobId);
    if (job) {
      job._progress = progress;
      this.emit('progress', job, progress);
    }
    return job;
  }

  // Get active jobs
  async getActive() {
    return this.jobs.filter(job => job.state === 'active');
  }

  // Get waiting jobs
  async getWaiting() {
    return this.jobs.filter(job => job.state === 'waiting');
  }

  // Get completed jobs
  async getCompleted() {
    return this.jobs.filter(job => job.state === 'completed');
  }

  // Get failed jobs
  async getFailed() {
    return this.jobs.filter(job => job.state === 'failed');
  }

  // Get job count
  async count() {
    return this.jobs.length;
  }

  // Clean up old jobs
  async clean(age, state) {
    const cutoff = Date.now() - age;
    this.jobs = this.jobs.filter(job => {
      if (state && job.state !== state) return true;
      
      const timestamp = job.finishedOn || job.timestamp;
      return timestamp > cutoff;
    });
    
    return true;
  }
}

// Create queues
const emailQueue = new MemoryQueue('email-queue');
const bulkEmailQueue = new MemoryQueue('bulk-email-queue');

// Process individual emails
emailQueue.on('added', () => {
  // Import here to avoid circular dependency
  const { processEmail } = require('./emailService');
  
  emailQueue.process(5, async (job) => {
    console.log(`Processing email job ${job.id} for recipient: ${job.data.recipient}`);
    const result = await processEmail(job.data);
    console.log(`Email job ${job.id} completed successfully`);
    return result;
  });
});

// Process bulk jobs
bulkEmailQueue.on('added', () => {
  bulkEmailQueue.process(1, async (job) => {
    console.log(`Processing bulk email job ${job.id} with ${job.data.recipients.length} recipients`);
    const { emailConfig, recipients, templateVarsArray = [] } = job.data;
    const totalRecipients = recipients.length;
    
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
      await bulkEmailQueue.progress(job.id, Math.floor((i + 1) / totalRecipients * 100));
      
      // Add a small delay
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
  });
});

module.exports = {
  emailQueue,
  bulkEmailQueue,
  createBulkJob: async (data) => bulkEmailQueue.add(data),
  getJob: async (jobId) => {
    let job = await emailQueue.getJob(jobId);
    if (!job) job = await bulkEmailQueue.getJob(jobId);
    return job;
  },
  getActiveJobs: async (limit = 100, skip = 0) => {
    const [emailActive, emailWaiting, bulkActive, bulkWaiting] = await Promise.all([
      emailQueue.getActive(),
      emailQueue.getWaiting(),
      bulkEmailQueue.getActive(),
      bulkEmailQueue.getWaiting()
    ]);
    
    const allJobs = [...emailActive, ...emailWaiting, ...bulkActive, ...bulkWaiting]
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return allJobs.slice(skip, skip + limit);
  },
  getJobCount: async () => {
    const [emailCount, bulkCount] = await Promise.all([
      emailQueue.count(),
      bulkEmailQueue.count()
    ]);
    
    return emailCount + bulkCount;
  },
  cleanOldJobs: async (age = 7 * 24 * 60 * 60 * 1000) => {
    await emailQueue.clean(age, 'completed');
    await emailQueue.clean(age, 'failed');
    await bulkEmailQueue.clean(age, 'completed');
    await bulkEmailQueue.clean(age, 'failed');
  }
};