// src/middleware/security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const { body, validationResult } = require('express-validator');

/**
 * API Rate Limiters
 */
const standardLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many attempts. Please try again after 15 minutes.'
  }
});

const streamingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 60,  // 60 requests per minute for streaming endpoints
  message: {
    success: false,
    message: 'Streaming rate limit exceeded.'
  }
});

/**
 * Helmet security headers configuration
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://*.firebaseio.com", "https://*.cloudinary.com"],
      imgSrc: ["'self'", "data:", "https://*.cloudinary.com", "https://*.firebaseapp.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"]
    }
  },
  crossOriginEmbedderPolicy: false  // Allow embedded media
});

/**
 * Request validation middleware
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  };
};

/**
 * Common validators
 */
const validators = {
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  objectId: (field) => 
    body(field).isMongoId().withMessage(`Invalid ${field} ID format`)
};

module.exports = {
  standardLimiter,
  strictLimiter,
  streamingLimiter,
  securityHeaders,
  compression: compression(),
  mongoSanitize: mongoSanitize(),
  validate,
  validators
};
