const crypto = require('crypto');

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
function generateId() {
  return crypto.randomUUID();
}

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
function generateRandomString(length = 32) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

/**
 * Parse JSON safely
 * @param {string} jsonString - JSON string to parse
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any} Parsed object or fallback
 */
function safeParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return fallback;
  }
}

/**
 * Format error response
 * @param {Error} error - Error object
 * @returns {object} Formatted error response
 */
function formatErrorResponse(error) {
  return {
    error: error.message,
    status: error.status || 500,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };
}

/**
 * Format success response
 * @param {any} data - Data to return
 * @param {string} message - Success message
 * @returns {object} Formatted success response
 */
function formatSuccessResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Delay execution
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate string
 * @param {string} str - String to truncate
 * @param {number} length - Max length
 * @returns {string} Truncated string
 */
function truncate(str, length = 50) {
  if (str.length <= length) return str;
  return str.substring(0, length - 3) + '...';
}

/**
 * Deep clone object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

module.exports = {
  generateId,
  generateRandomString,
  safeParse,
  formatErrorResponse,
  formatSuccessResponse,
  delay,
  truncate,
  deepClone,
};
