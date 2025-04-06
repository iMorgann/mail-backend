# Modern Email Service Backend

A powerful, scalable backend for sending bulk emails with personalization, queue management, and rate limiting.

## Features

- ✅ Secure SMTP credentials management
- ✅ Bulk email sending with queue management
- ✅ Email personalization with template variables
- ✅ Rate limiting to prevent server blacklisting
- ✅ Job status monitoring and tracking
- ✅ Error handling and retry logic
- ✅ Scalable architecture with Redis queue

## Technology Stack

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Bull** - Redis-based queue for job processing
- **Nodemailer** - Email sending library
- **Redis** - For queue storage and rate limiting
- **Docker** - For containerization (optional)

## Requirements

- Node.js 16+
- Redis server
- SMTP server access

## Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/email-service-backend.git
cd email-service-backend
```

2. Install dependencies:
```
npm install
```

3. Configure environment variables:
```
cp .env.example .env
```

Edit the `.env` file with your configuration settings.

4. Start Redis (if not already running):
```
# Using Docker
docker run -d -p 6379:6379 redis

# Or use your system's Redis service
```

5. Start the server:
```
npm start

# For development with auto-restart
npm run dev
```

## API Endpoints

### Email Sending

- `POST /api/email/send` - Send a single email
- `POST /api/email/bulk` - Send emails in bulk

### Job Management

- `GET /api/email/status/:jobId` - Get status of an email job
- `GET /api/email/jobs` - Get all active email jobs
- `DELETE /api/email/jobs/:jobId` - Cancel a job

### Configuration

- `POST /api/email/validate` - Validate email configuration

## Request Examples

### Sending a Single Email

```json
POST /api/email/send
{
  "emailConfig": {
    "smtpServer": "smtp.example.com",
    "smtpPort": "587",
    "username": "user@example.com",
    "smtpPassword": "password",
    "fromName": "Your Company",
    "fromEmail": "noreply@example.com",
    "replyTo": "support@example.com",
    "subject": "Welcome to {{company}}!",
    "message": "<h1>Hello {{name}}</h1><p>Welcome to our service!</p>",
    "messageType": "html"
  },
  "recipient": "customer@example.com",
  "templateVars": {
    "name": "John Doe",
    "company": "Your Company"
  }
}
```

### Sending Bulk Emails

```json
POST /api/email/bulk
{
  "emailConfig": {
    "smtpServer": "smtp.example.com",
    "smtpPort": "587",
    "username": "user@example.com",
    "smtpPassword": "password",
    "fromName": "Your Company",
    "fromEmail": "noreply@example.com",
    "replyTo": "support@example.com",
    "subject": "Welcome to {{company}}!",
    "message": "<h1>Hello {{name}}</h1><p>Welcome to our service!</p>",
    "messageType": "html"
  },
  "recipients": [
    "customer1@example.com",
    "customer2@example.com",
    "customer3@example.com"
  ],
  "templateVarsArray": [
    { "name": "John Doe" },
    { "name": "Jane Smith" },
    { "name": "Bob Johnson" }
  ]
}
```

## Deployment

### Docker

Build and run with Docker:

```
docker build -t email-service-backend .
docker run -p 5000:5000 -d email-service-backend
```

### Render

1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect to your GitHub repository
4. Configure the service:
   - Environment: Node.js
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add environment variables from your `.env` file

### Heroku

```
heroku create
heroku addons:create heroku-redis:hobby-dev
git push heroku main
```

## Frontend Integration

For frontend integration, update your React app's API calls to point to the backend endpoints. See the example in `docs/frontend-integration.js`.

## License

MIT