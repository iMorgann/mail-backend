# Frontend Integration Guide

This guide explains how to integrate your React frontend with the Email Service backend.

## Overview

To connect your frontend to the backend, you'll need to:

1. Update API endpoints in your frontend code
2. Handle authentication (if implemented)
3. Modify the UI to support the new async workflow
4. Implement status polling

## API Endpoints

Your frontend should use these endpoints:

| Endpoint | Description |
|----------|-------------|
| `POST /api/email/send` | Send a single email |
| `POST /api/email/bulk` | Send multiple emails |
| `GET /api/email/status/:jobId` | Check status of a job |
| `GET /api/email/jobs` | List all jobs |
| `DELETE /api/email/jobs/:jobId` | Cancel a job |
| `POST /api/email/validate` | Validate SMTP configuration |

## Code Changes

### 1. API Service

Create a service file to handle API requests:

```javascript
// src/services/emailApi.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const emailApi = {
  // Send a single email
  sendEmail: async (emailConfig, recipient, templateVars) => {
    const response = await fetch(`${API_BASE_URL}/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailConfig, recipient, templateVars }),
    });
    return response.json();
  },

  // Send bulk emails
  sendBulkEmails: async (emailConfig, recipients, templateVarsArray) => {
    const response = await fetch(`${API_BASE_URL}/email/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailConfig, recipients, templateVarsArray }),
    });
    return response.json();
  },

  // Check job status
  getJobStatus: async (jobId) => {
    const response = await fetch(`${API_BASE_URL}/email/status/${jobId}`);
    return response.json();
  },
  
  // Get all jobs
  getJobs: async () => {
    const response = await fetch(`${API_BASE_URL}/email/jobs`);
    return response.json();
  },
  
  // Cancel a job
  cancelJob: async (jobId) => {
    const response = await fetch(`${API_BASE_URL}/email/jobs/${jobId}`, {
      method: 'DELETE',
    });
    return response.json();
  },
  
  // Validate SMTP configuration
  validateConfig: async (emailConfig) => {
    const response = await fetch(`${API_BASE_URL}/email/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailConfig }),
    });
    return response.json();
  },
};
```

### 2. Update App.js

Modify your form submission logic to use the new API:

```javascript
import { emailApi } from './services/emailApi';
import { useEffect, useRef, useState } from 'react';

// Inside your component:
const [jobId, setJobId] = useState(null);
const statusPollingRef = useRef(null);

// Form submission handler
const onSubmit = async (data) => {
  try {
    setIsLoading(true);
    setProgress(0);
    setLogs([]);
    
    // Parse recipients
    const recipientList = data.recipients
      .split(/[,;\s\n]+/)
      .filter(email => email.trim() !== "");
    
    // Validate emails
    const { errors, validEmails } = validateEmails(recipientList);
    if (errors.length > 0) {
      setValidationErrors(errors);
      addLog(`Found ${errors.length} invalid email addresses`, "error");
      setIsLoading(false);
      return;
    }
    
    // Get message content
    const message = data.messageType === "html"
      ? (editorRef.current ? editorRef.current.getContent() : data.message)
      : data.message;
    
    // Create SMTP config
    const emailConfig = {
      smtpServer: data.smtpServer,
      smtpPort: data.smtpPort,
      username: data.username,
      smtpPassword: data.smtpPassword,
      fromName: data.fromName,
      fromEmail: data.fromEmail,
      replyTo: data.replyTo,
      subject: data.subject,
      message: message,
      messageType: data.messageType,
      rateLimit: data.rateLimit || 5
    };
    
    // Set total recipients for progress tracking
    setTotalRecipients(validEmails.length);
    
    // Send emails
    addLog(`Sending emails to ${validEmails.length} recipients...`, "info");
    const result = await emailApi.sendBulkEmails(emailConfig, validEmails);
    
    if (result.success) {
      setJobId(result.jobId);
      addLog(`Job created with ID: ${result.jobId}`, "success");
      startStatusPolling(result.jobId);
    } else {
      addLog(`Error: ${result.error}`, "error");
      setIsLoading(false);
    }
  } catch (error) {
    addLog(`Error: ${error.message}`, "error");
    setIsLoading(false);
  }
};

// Status polling
const startStatusPolling = (id) => {
  // Clear any existing polling
  if (statusPollingRef.current) {
    clearInterval(statusPollingRef.current);
  }
  
  statusPollingRef.current = setInterval(async () => {
    try {
      const status = await emailApi.getJobStatus(id);
      
      if (status.progress) {
        setProgress(status.progress);
      }
      
      if (status.state === 'completed') {
        addLog("All emails processed successfully!", "success");
        setIsLoading(false);
        clearInterval(statusPollingRef.current);
      } else if (status.state === 'failed') {
        addLog(`Job failed: ${status.failedReason || 'Unknown error'}`, "error");
        setIsLoading(false);
        clearInterval(statusPollingRef.current);
      }
    } catch (error) {
      addLog(`Error checking status: ${error.message}`, "error");
    }
  }, 2000); // Check every 2 seconds
};

// Clean up on unmount
useEffect(() => {
  return () => {
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current);
    }
  };
}, []);
```

### 3. Add Job Management UI

Add a new component to view and manage jobs:

```jsx
import React, { useState, useEffect } from 'react';
import { emailApi } from '../services/emailApi';

const JobsMonitor = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const result = await emailApi.getJobs();
      setJobs(result.jobs || []);
      setError(null);
    } catch (err) {
      setError('Failed to load jobs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const cancelJob = async (jobId) => {
    try {
      await emailApi.cancelJob(jobId);
      fetchJobs(); // Refresh the list
    } catch (err) {
      setError('Failed to cancel job');
      console.error(err);
    }
  };
  
  useEffect(() => {
    fetchJobs();
    // Set up polling
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);
  
  if (loading && jobs.length === 0) {
    return <div>Loading jobs...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  return (
    <div className="jobs-monitor">
      <h2>Email Jobs</h2>
      <button onClick={fetchJobs}>Refresh</button>
      
      {jobs.length === 0 ? (
        <p>No active jobs</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Recipients</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.id}>
                <td>{job.id}</td>
                <td>{job.type}</td>
                <td>{job.state}</td>
                <td>{job.progress}%</td>
                <td>{job.recipientCount}</td>
                <td>{new Date(job.timestamp).toLocaleString()}</td>
                <td>
                  {job.state !== 'completed' && job.state !== 'failed' && (
                    <button onClick={() => cancelJob(job.id)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default JobsMonitor;
```

## SMTP Configuration Testing

Add a button to test SMTP configuration before sending:

```jsx
const testSmtpConnection = async () => {
  try {
    setTesting(true);
    
    const emailConfig = {
      smtpServer: watch('smtpServer'),
      smtpPort: watch('smtpPort'),
      username: watch('username'),
      smtpPassword: watch('smtpPassword')
    };
    
    const result = await emailApi.validateConfig(emailConfig);
    
    if (result.success) {
      addLog('SMTP connection successful!', 'success');
    } else {
      addLog(`SMTP connection failed: ${result.message}`, 'error');
    }
  } catch (error) {
    addLog(`Error testing connection: ${error.message}`, 'error');
  } finally {
    setTesting(false);
  }
};

// Add this button to your SMTP settings form
<button 
  type="button" 
  onClick={testSmtpConnection}
  disabled={testing}
>
  {testing ? 'Testing...' : 'Test Connection'}
</button>
```

## Environment Setup

Create an `.env` file in your React project root:

```
REACT_APP_API_URL=http://localhost:5000/api
```

For production, set the appropriate URL in your deployment environment.

## Cross-Origin Issues

If you encounter CORS issues:

1. Ensure the backend has CORS properly configured
2. For local development, make sure ports are different (e.g., frontend on 3000, backend on 5000)
3. Use a proxy in package.json for development:

```json
{
  "proxy": "http://localhost:5000"
}
```

## Production Considerations

1. **Security**: Never expose SMTP credentials in frontend code. Always use the backend API.
2. **Error Handling**: Implement comprehensive error handling for API failures.
3. **User Experience**: Show clear progress indicators during sending.
4. **Rate Limiting**: Inform users about rate limits if they exist.
5. **Responsive Design**: Ensure the UI works well on various devices.