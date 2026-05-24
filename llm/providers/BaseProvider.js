const logger = require('../../config/logger');

/**
 * Base LLM Provider class
 * All LLM providers should extend this class
 */
class BaseProvider {
  constructor(config = {}) {
    this.name = config.name || 'base';
    this.model = config.model || null;
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 30000;
    this.config = config;
  }

  /**
   * Initialize provider
   * @returns {Promise}
   */
  async initialize() {
    logger.info(`Initializing LLM provider: ${this.name}`);
  }

  /**
   * Send chat request to LLM
   * @param {string} prompt - User prompt
   * @param {array} conversationHistory - Previous messages
   * @param {object} options - Additional options
   * @returns {Promise} LLM response
   */
  async chat(prompt, conversationHistory = [], options = {}) {
    throw new Error(`Provider ${this.name} must implement chat method`);
  }

  /**
   * Check if provider is available/healthy
   * @returns {Promise} true if available
   */
  async isAvailable() {
    throw new Error(`Provider ${this.name} must implement isAvailable method`);
  }

  /**
   * Extract tool calls from LLM response
   * @param {string} response - LLM response text
   * @returns {array} Extracted tool calls
   */
  extractToolCalls(response) {
    // Try to parse JSON from response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.toolCalls) {
          return parsed.toolCalls;
        }
      }
    } catch (error) {
      logger.debug('Failed to extract tool calls', { error: error.message });
    }
    return [];
  }

  /**
   * Format response
   * @param {string} content - Response content
   * @param {object} metadata - Additional metadata
   * @returns {object} Formatted response
   */
  formatResponse(content, metadata = {}) {
    return {
      content,
      provider: this.name,
      model: this.model,
      timestamp: new Date().toISOString(),
      ...metadata,
    };
  }

  /**
   * Count tokens in text (rough estimate)
   * @param {string} text - Text to count
   * @returns {number} Token count
   */
  countTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Get provider info
   * @returns {object} Provider information
   */
  getInfo() {
    return {
      name: this.name,
      model: this.model,
      available: false,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
    };
  }
}

module.exports = BaseProvider;
