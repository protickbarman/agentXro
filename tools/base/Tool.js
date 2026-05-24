const logger = require('../../config/logger');
const { retryWithBackoff } = require('../../utils/retry');
const { ToolExecutionError } = require('../../utils/errorTypes');

/**
 * Base Tool class
 * All tools should extend this class
 */
class Tool {
  constructor(name, schema = {}) {
    this.name = name;
    this.schema = schema;
    this.maxRetries = 3;
    this.timeout = 30000; // 30 seconds default
  }

  /**
   * Get tool schema for LLM
   * @returns {object} JSON schema
   */
  getSchema() {
    return {
      name: this.name,
      description: this.schema.description || 'No description',
      parameters: this.schema.parameters || {},
    };
  }

  /**
   * Validate input parameters
   * @param {object} params - Input parameters
   * @throws {Error} If validation fails
   */
  validate(params) {
    // Override in subclasses
    return true;
  }

  /**
   * Execute the tool
   * @param {object} params - Input parameters
   * @returns {Promise} Execution result
   */
  async execute(params) {
    throw new Error(`Tool ${this.name} must implement execute method`);
  }

  /**
   * Execute with timeout
   * @param {object} params - Input parameters
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Execution result
   */
  async executeWithTimeout(params, timeout = this.timeout) {
    return Promise.race([
      this.execute(params),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Tool ${this.name} execution timeout after ${timeout}ms`)),
          timeout
        )
      ),
    ]);
  }

  /**
   * Execute with retry
   * @param {object} params - Input parameters
   * @param {number} maxRetries - Maximum retries
   * @returns {Promise} Execution result
   */
  async executeWithRetry(params, maxRetries = this.maxRetries) {
    return retryWithBackoff(
      () => this.executeWithTimeout(params),
      maxRetries,
      1000, // baseDelay: 1 second
      2 // multiplier: exponential backoff
    );
  }

  /**
   * Format success result
   * @param {any} data - Result data
   * @returns {object} Formatted result
   */
  formatResult(data) {
    return {
      success: true,
      data,
      toolName: this.name,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format error result
   * @param {Error} error - Error object
   * @returns {object} Formatted error
   */
  formatError(error) {
    return {
      success: false,
      error: error.message,
      toolName: this.name,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = Tool;
