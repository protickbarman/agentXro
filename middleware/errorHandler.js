const logger = require('../config/logger');
const { formatErrorResponse } = require('../utils/helpers');

/**
 * Global error handler middleware
 * Must be last middleware in Express app
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Unhandled error', {
    error: err.message,
    status: err.status || 500,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  // Format and send response
  const status = err.status || 500;
  const response = formatErrorResponse(err);

  res.status(status).json(response);
};

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors
 * Usage: router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  asyncHandler,
};
