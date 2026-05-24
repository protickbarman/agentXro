const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const env = require('../config/env');
const User = require('../models/User');
const Session = require('../models/Session');
const { AuthenticationError, ValidationError, ConflictError } = require('../utils/errorTypes');

class AuthService {
  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} username - User username (optional)
   * @returns {Promise} User object
   */
  static async register(email, password, username = null) {
    try {
      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      // Hash password
      const bcryptRounds = env.SECURITY.bcryptRounds || 10;
      const passwordHash = await bcrypt.hash(password, bcryptRounds);

      // Create user
      const user = await User.create(email, passwordHash, username || email.split('@')[0]);

      logger.info('User registered', { userId: user.id, email });

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at,
      };
    } catch (error) {
      logger.error('Registration failed', { email, error: error.message });
      throw error;
    }
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} Tokens and user info
   */
  static async login(email, password) {
    try {
      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Check if user is active
      if (!user.is_active) {
        throw new AuthenticationError('User account is inactive');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Generate tokens
      const { accessToken, refreshToken, expiresAt } = this.generateTokens(user.id);

      // Store refresh token in database
      const session = await Session.create(user.id, refreshToken, expiresAt);

      logger.info('User logged in', { userId: user.id, email, sessionId: session.id });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        accessToken,
        refreshToken,
        expiresIn: env.JWT.expiresIn,
      };
    } catch (error) {
      logger.warn('Login failed', { email, error: error.message });
      throw error;
    }
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise} New access token
   */
  static async refreshToken(refreshToken) {
    try {
      // Find session by refresh token
      const session = await Session.findByRefreshToken(refreshToken);
      if (!session) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      // Verify refresh token signature
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, env.JWT.refreshSecret);
      } catch (error) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { id: decoded.id, email: decoded.email },
        env.JWT.secret,
        { expiresIn: env.JWT.expiresIn }
      );

      logger.info('Access token refreshed', { userId: session.user_id, sessionId: session.id });

      return {
        accessToken,
        expiresIn: env.JWT.expiresIn,
      };
    } catch (error) {
      logger.warn('Token refresh failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Logout user (revoke session)
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (for ownership verification)
   * @returns {Promise}
   */
  static async logout(sessionId, userId) {
    try {
      // Verify session ownership before revoking
      const session = await Session.findById(sessionId);
      if (!session) {
        throw new AuthenticationError('Session not found');
      }
      if (session.user_id !== userId) {
        throw new AuthenticationError('Not authorized to revoke this session');
      }
      await Session.revoke(sessionId);
      logger.info('User logged out', { sessionId, userId });
    } catch (error) {
      logger.error('Logout failed', { sessionId, error: error.message });
      throw error;
    }
  }

  /**
   * Logout all sessions for user
   * @param {string} userId - User ID
   * @returns {Promise}
   */
  static async logoutAll(userId) {
    try {
      await Session.revokeAllByUser(userId);
      logger.info('All sessions revoked for user', { userId });
    } catch (error) {
      logger.error('Logout all failed', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Generate JWT tokens
   * @param {string} userId - User ID
   * @param {string} email - User email (optional)
   * @returns {object} Access and refresh tokens
   */
  static generateTokens(userId, email = null) {
    const payload = { id: userId, email };

    // Access token (short-lived)
    const accessToken = jwt.sign(payload, env.JWT.secret, {
      expiresIn: env.JWT.expiresIn,
    });

    // Refresh token (long-lived)
    const refreshToken = jwt.sign(payload, env.JWT.refreshSecret, {
      expiresIn: env.JWT.refreshExpiresIn,
    });

    // Calculate expiry date for refresh token
    const refreshExpiryValue = env.JWT.refreshExpiresIn || '5d';
    let expiresAt;
    if (refreshExpiryValue.endsWith('d')) {
      const days = parseInt(refreshExpiryValue);
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } else if (refreshExpiryValue.endsWith('h')) {
      const hours = parseInt(refreshExpiryValue);
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    } else if (refreshExpiryValue.endsWith('m')) {
      const minutes = parseInt(refreshExpiryValue);
      expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    } else {
      // Default: 5 days
      expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    }

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Verify token
   * @param {string} token - JWT token
   * @param {string} secret - Secret key
   * @returns {object} Decoded token
   */
  static verifyToken(token, secret = env.JWT.secret) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      throw new AuthenticationError('Invalid token');
    }
  }
}

module.exports = AuthService;
