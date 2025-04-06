# Email Service Backend Setup Guide

This guide will help you set up the Email Service Backend with minimal effort.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (version 16.x or higher)
2. **Redis** installed and running locally (or a Redis server you can connect to)
3. **Git** for cloning the repository

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/email-service-backend.git
cd email-service-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file and fill in your configuration:

```
# Server Configuration
PORT=5000
NODE_ENV=development

# Redis Configuration (for queue)
REDIS_URL=redis://127.0.0.1:6379

# Rate Limits
EMAIL_RATE_LIMIT=5
API_RATE_LIMIT=100
```

### 4. Start Redis (if not already running)

If you need to start Redis locally and you have Docker installed:

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

Or install and start Redis based on your operating system.

### 5. Start the Server and Worker

For development with auto-restart (both server and worker):

```bash
npm run dev:all
```

Or start them separately:

```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Start the worker
npm run worker
```

For production:

```bash
npm start
```

And in another terminal or process:

```bash
node worker.js
```

### 6. Verify Installation

The server should now be running at `http://localhost:5000`.

You can test the health endpoint:

```bash
curl http://localhost:5000/health
```

## Common Issues and Solutions

### Redis Connection Error

If you see an error like:

```
Error: Redis connection failed
```

Make sure:
- Redis is running on the expected host and port
- Your firewall allows connections to the Redis port
- The REDIS_URL in your .env file is correct

### Worker Not Processing Jobs

If jobs are being created but not processed:

1. Make sure the worker is running (`npm run worker`)
2. Check for errors in the worker console output
3. Verify Redis is properly configured and accessible 

### SMTP Configuration Issues

If you get SMTP connection errors when testing or sending emails:

1. Verify your SMTP credentials are correct
2. Ensure the SMTP server allows the connection (check firewall rules)
3. Some providers require special settings or app passwords for SMTP access

## File Structure

```
mail-backend/
├── .env                      # Environment variables
├── package.json             # Dependencies and scripts
├── worker.js                # Worker process for processing emails
├── server.js                # Main server file
├── routes/
│   └── email.js             # API routes for email operations
├── controllers/
│   └── emailController.js   # Business logic for email sending
├── middlewares/
│   ├── errorHandler.js      # Error handling middleware
│   └── rateLimiter.js       # Rate limiting middleware
├── services/
│   ├── emailService.js      # Core email sending functionality
│   └── queueService.js      # Queue management for bulk emails
├── utils/
│   ├── templating.js        # Template processing utilities
│   └── validation.js        # Input validation utilities
├── models/
│   └── email.js             # Data model for emails
└── config/
    ├── environment.js       # Environment configuration
    └── smtp.js              # SMTP configuration
```

## Next Steps

1. **Integrate with your frontend**: Update your frontend to use the API endpoints (see docs for integration examples)
2. **Set up monitoring**: Consider adding Prometheus or similar monitoring for production
3. **Improve authentication**: Add proper authentication for the API endpoints
4. **Implement logging**: Set up structured logging for better troubleshooting

Need help? Check the documentation or open an issue on GitHub.