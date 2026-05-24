const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: req.user?.id || 'anonymous',
    });
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Auth endpoints limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      userId: req.body?.email || 'unknown',
    });
    res.status(429).json({
      error: 'Too many authentication attempts',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Tool execution limiter
const toolLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // limit each user to 50 tool executions per minute
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    logger.warn('Tool rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip,
    });
    res.status(429).json({
      error: 'Too many tool executions',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  toolLimiter,
};
