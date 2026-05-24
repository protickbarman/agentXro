const logger = require('../config/logger');

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} multiplier - Multiplier for exponential backoff
 * @returns {Promise} Result of function execution
 */
async function retryWithBackoff(
  fn,
  maxRetries = 3,
  baseDelay = 1000,
  multiplier = 2
) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Attempt ${attempt + 1}/${maxRetries + 1}`);
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(multiplier, attempt);
        logger.warn(`Retry after ${delay}ms`, {
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          error: error.message,
        });
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with custom retry condition
 * @param {Function} fn - Async function to retry
 * @param {Function} shouldRetry - Function to determine if should retry
 * @param {number} maxRetries - Maximum retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of function execution
 */
async function retryIf(fn, shouldRetry, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries && shouldRetry(error)) {
        const delay = baseDelay * (attempt + 1);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}

module.exports = {
  retryWithBackoff,
  retryIf,
  sleep,
};
