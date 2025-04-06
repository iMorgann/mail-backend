# Email Service Deployment Guide

This guide provides instructions for deploying the Email Service backend to various environments.

## Prerequisites

Before deploying, ensure you have:

1. Node.js 16+ installed
2. Redis server accessible from your deployment environment
3. SMTP server credentials
4. Git (for source control)

## Local Deployment

### Step 1: Clone the repository and install dependencies

```bash
git clone https://github.com/yourusername/email-service-backend.git
cd email-service-backend
npm install
```

### Step 2: Configure environment variables

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```
PORT=5000
NODE_ENV=development
REDIS_URL=redis://127.0.0.1:6379
```

### Step 3: Start Redis (if not already running)

```bash
# Using Docker
docker run -d -p 6379:6379 redis

# Or use your system's Redis service
```

### Step 4: Run the application

```bash
# Start the main server
npm start

# In a separate terminal, start the worker process
node worker.js
```

## Docker Deployment

### Using Docker Compose (recommended for local/testing)

```bash
# Build and start the services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Using Docker manually

```bash
# Build the Docker image
docker build -t email-service-backend .

# Run Redis
docker run -d --name redis -p 6379:6379 redis

# Run the application
docker run -d --name email-service \
  -p 5000:5000 \
  --link redis:redis \
  -e REDIS_URL=redis://redis:6379 \
  -e NODE_ENV=production \
  email-service-backend

# Run the worker
docker run -d --name email-worker \
  --link redis:redis \
  -e REDIS_URL=redis://redis:6379 \
  -e NODE_ENV=production \
  email-service-backend \
  node worker.js
```

## Cloud Deployment

### Render

1. Push your code to GitHub
2. Create a new Redis instance on Render or use a third-party Redis provider
3. Create a Web Service on Render:
   - Connect to your GitHub repository
   - Set environment variables (including REDIS_URL)
   - Build Command: `npm install`
   - Start Command: `node server.js`
4. Create a Background Worker on Render:
   - Connect to the same GitHub repository
   - Set the same environment variables
   - Build Command: `npm install`
   - Start Command: `node worker.js`

### Heroku

1. Create a Heroku account and install the CLI
2. Initialize a Git repository and commit your code

```bash
heroku create
heroku addons:create heroku-redis:hobby-dev

# Deploy the web server
git push heroku main

# Deploy the worker (using a Procfile with a worker dyno)
# Add to Procfile: "worker: node worker.js"
heroku ps:scale worker=1
```

### Digital Ocean App Platform

1. Create a Digital Ocean account
2. Create a new App from GitHub
3. Add Redis as a component
4. Add two services:
   - Web service that runs `npm start`
   - Worker service that runs `node worker.js`
5. Configure environment variables

## Scaling Considerations

### Horizontal Scaling

- Deploy multiple instances of the worker process
- Use a load balancer for API requests
- Ensure Redis is properly configured for multiple connections

### Vertical Scaling

- Increase memory allocation for processing large volumes of emails
- Adjust concurrency settings in Bull queue (see `queueService.js`)
- Optimize Redis performance

## Monitoring

Consider setting up:

1. Prometheus/Grafana for metrics
2. Sentry or LogRocket for error tracking
3. ELK stack or Logtail for log management

## Security Recommendations

1. Store SMTP credentials securely using environment variables
2. Implement proper authentication for API endpoints
3. Set up HTTPS using a reverse proxy (Nginx, Caddy)
4. Regularly update dependencies
5. Set up IP allowlisting for production environments

## CI/CD Setup

Example GitHub Actions workflow:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to production
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "your-app-name"
          heroku_email: "your-email@example.com"
```

## Troubleshooting

### Common Issues

1. **Redis connection errors**:
   - Check if Redis is running
   - Verify REDIS_URL is correct
   - Ensure Redis port is open

2. **Email sending failures**:
   - Verify SMTP credentials
   - Check for rate limiting or authentication issues
   - Examine logs for specific error messages

3. **Worker process crashes**:
   - Check for memory limits
   - Ensure error handling is robust
   - Use a process manager like PM2 for automatic restarts

## Support

If you encounter issues, please:

1. Check the logs for error messages
2. Review the documentation
3. Open an issue on GitHub with detailed information about the problem