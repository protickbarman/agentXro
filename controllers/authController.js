const bcrypt = require('bcryptjs');
const logger = require('../config/logger');
const AuthService = require('../services/AuthService');
const User = require('../models/User');
const Session = require('../models/Session');
const env = require('../config/env');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateOrThrow, schemas } = require('../utils/validation');
const { formatSuccessResponse } = require('../utils/helpers');

/**
 * Register new user
 * POST /api/auth/register
 */
exports.register = asyncHandler(async (req, res) => {
  const { email, password, username } = validateOrThrow(
    req.body,
    schemas.userRegistrationSchema
  );

  const user = await AuthService.register(email, password, username);

  res.status(201).json(
    formatSuccessResponse(user, 'User registered successfully')
  );
});

/**
 * Login user
 * POST /api/auth/login
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = validateOrThrow(
    req.body,
    schemas.userLoginSchema
  );

  const result = await AuthService.login(email, password);

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json(
    formatSuccessResponse(
      {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        wsUrl: `ws://localhost:${env.PORT}?token=${result.accessToken}`,
      },
      'Login successful'
    )
  );
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      error: 'Refresh token not provided',
      status: 401,
    });
  }

  const result = await AuthService.refreshToken(refreshToken);

  res.json(
    formatSuccessResponse(
      {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      },
      'Token refreshed successfully'
    )
  );
});

/**
 * Logout user
 * POST /api/auth/logout
 */
exports.logout = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({
      error: 'Session ID required',
      status: 400,
    });
  }

  await AuthService.logout(sessionId, userId);

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  res.json(
    formatSuccessResponse(null, 'Logged out successfully')
  );
});

/**
 * Logout all sessions
 * POST /api/auth/logout-all
 */
exports.logoutAll = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await AuthService.logoutAll(userId);

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  res.json(
    formatSuccessResponse(null, 'Logged out from all sessions')
  );
});

/**
 * Get current user info
 * GET /api/auth/me
 */
exports.getMe = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      status: 404,
    });
  }

  res.json(
    formatSuccessResponse(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      'User info retrieved'
    )
  );
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { username, email } = validateOrThrow(
    req.body,
    schemas.profileUpdateSchema
  );

  const updates = {};
  if (username !== undefined) updates.username = username;
  if (email !== undefined) updates.email = email.toLowerCase();

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      error: 'No valid fields to update',
      status: 400,
    });
  }

  const updatedUser = await User.update(userId, updates);

  if (!updatedUser) {
    return res.status(400).json({
      error: 'Profile update failed',
      status: 400,
    });
  }

  logger.info('Profile updated', { userId });

  res.json(
    formatSuccessResponse(
      {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        updatedAt: updatedUser.updated_at,
      },
      'Profile updated successfully'
    )
  );
});

/**
 * Change password
 * POST /api/auth/change-password
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = validateOrThrow(
    req.body,
    schemas.passwordChangeSchema
  );

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      status: 404,
    });
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({
      error: 'Current password is incorrect',
      status: 401,
    });
  }

  const bcryptRounds = env.SECURITY.bcryptRounds || 10;
  const newPasswordHash = await bcrypt.hash(newPassword, bcryptRounds);

  await User.updatePassword(userId, newPasswordHash);

  // Revoke all other sessions for security
  await Session.revokeAllByUser(userId);

  logger.info('Password changed', { userId });

  res.json(
    formatSuccessResponse(null, 'Password changed successfully')
  );
});
