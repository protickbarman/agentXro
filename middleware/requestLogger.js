const logger = require('../config/logger');

/**
 * Request logging middleware
 * Logs all incoming HTTP requests
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  // Override send to log response
  res.send = function (data) {
    const duration = Date.now() - start;

    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: req.user?.id || 'anonymous',
    });

    // Call original send
    res.send = originalSend;
    return res.send(data);
  };

  next();
};

module.exports = requestLogger;
