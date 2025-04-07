// server.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const dotenv = require('dotenv');
const emailRoutes = require('./routes/email');
const { globalLimiter } = require('./middlewares/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const { PORT } = require('./config/environment');

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy - Add this line before other middleware
app.set('trust proxy', 1);

// Apply middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));

// Simplified CORS configuration to allow all origins
app.use(cors({
  origin: function(origin, callback) {
    // Allow all origins by always returning true
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));
app.use(globalLimiter);

// Add a root route for better health checks
app.get('/', (req, res) => {
  res.status(200).send('Email Service API is running');
});

// Routes
app.use('/api/email', emailRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// 404 and error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;