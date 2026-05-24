const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const env = require('../config/env');
const { AuthenticationError } = require('../utils/errorTypes');

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, env.JWT.secret);
  } catch (error) {
    logger.warn('Token verification failed', { error: error.message });
    throw new AuthenticationError('Invalid token');
  }
}

/**
 * Generate JWT token
 * @param {object} payload - Token payload
 * @returns {string} JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, env.JWT.secret, {
    expiresIn: env.JWT.expiresIn,
  });
}

/**
 * Generate refresh token
 * @param {object} payload - Token payload
 * @returns {string} Refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, env.JWT.refreshSecret, {
    expiresIn: env.JWT.refreshExpiresIn,
  });
}

/**
 * Middleware to verify JWT token in request
 * Extracts token from Authorization header: "Bearer <token>"
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const decoded = verifyToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      path: req.path,
      error: error.message,
    });
    res.status(error.status || 401).json({
      error: error.message,
      status: error.status || 401,
    });
  }
};

/**
 * Optional auth middleware - doesn't fail if no token
 */
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Don't fail, just continue without user
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  verifyToken,
  generateToken,
  generateRefreshToken,
};
