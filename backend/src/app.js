// src/app.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const { securityHeaders, compression, mongoSanitize, standardLimiter } = require('./middleware/security');
const { authenticate } = require('./middleware/auth');
const logger = require('./utils/logger');

// Route imports
const animeRoutes = require('./routes/animeRoutes');
const episodeRoutes = require('./routes/episodeRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Security middleware
app.use(securityHeaders);
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourapp.com', 'https://admin.yourapp.com'] 
    : ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(compression);
app.use(mongoSanitize);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/v1/anime', animeRoutes);
app.use('/api/v1/episodes', episodeRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

module.exports = app;
