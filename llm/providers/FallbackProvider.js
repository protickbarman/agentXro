const axios = require('axios');
const logger = require('../../config/logger');
const BaseProvider = require('./BaseProvider');
const { retryWithBackoff } = require('../../utils/retry');

/**
 * Fallback LLM Provider
 * Uses free/cheaper LLM APIs for fallback
 */
class FallbackProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      name: 'fallback_llm',
      model: config.model || 'meta-llama/Llama-2-7b-chat-hf',
      provider: config.provider || 'huggingface',
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api-inference.huggingface.co/models',
      maxRetries: config.maxRetries || 2,
      timeout: config.timeout || 30000,
      ...config,
    });

    this.provider = config.provider;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.client = null;
  }

  /**
   * Initialize provider
   * @returns {Promise}
   */
  async initialize() {
    await super.initialize();

    if (!this.apiKey) {
      logger.warn('Fallback LLM API key not provided');
    }

    // Create axios client
    this.client = axios.create({
      timeout: this.timeout,
    });

    // Add auth if available
    if (this.apiKey) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey}`;
    }

    logger.info('Fallback LLM provider initialized', {
      provider: this.provider,
      model: this.model,
    });
  }

  /**
   * Check if provider is available
   * @returns {Promise} true if available
   */
  async isAvailable() {
    try {
      if (this.provider === 'huggingface') {
        const response = await this.client.post(
          `${this.baseUrl}/${this.model}`,
          { inputs: 'test' },
          {
            timeout: 5000,
          }
        );
        return response.status === 200;
      }
      return true;
    } catch (error) {
      logger.warn('Fallback provider availability check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Send chat request
   * @param {string} prompt - User prompt
   * @param {array} conversationHistory - Previous messages
   * @param {object} options - Additional options
   * @returns {Promise} LLM response
   */
  async chat(prompt, conversationHistory = [], options = {}) {
    return retryWithBackoff(
      () => this._chatInternal(prompt, conversationHistory, options),
      this.maxRetries,
      1000,
      2
    );
  }

  /**
   * Internal chat implementation
   * @private
   */
  async _chatInternal(prompt, conversationHistory = [], options = {}) {
    try {
      if (this.provider === 'huggingface') {
        return await this._huggingfaceChat(prompt, conversationHistory, options);
      }

      throw new Error(`Unsupported fallback provider: ${this.provider}`);
    } catch (error) {
      logger.error('Fallback provider chat failed', {
        error: error.message,
        provider: this.provider,
      });
      throw error;
    }
  }

  /**
   * HuggingFace API chat
   * @private
   */
  async _huggingfaceChat(prompt, conversationHistory = [], options = {}) {
    try {
      // Build conversation
      let fullPrompt = prompt;
      if (conversationHistory.length > 0) {
        const history = conversationHistory
          .map(msg => `${msg.role}: ${msg.content || msg}`)
          .join('\n');
        fullPrompt = `${history}\nuser: ${prompt}\nassistant:`;
      }

      // Call HuggingFace API
      const response = await this.client.post(
        `${this.baseUrl}/${this.model}`,
        {
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: options.maxTokens || 256,
            temperature: options.temperature || 0.7,
            top_p: options.topP || 0.95,
          },
        }
      );

      // Extract response
      let content = '';
      if (Array.isArray(response.data)) {
        content = response.data[0]?.generated_text || '';
        // Remove the input prompt from output
        content = content.replace(fullPrompt, '').trim();
      } else if (response.data.error) {
        throw new Error(response.data.error);
      }

      const tokensUsed = this.countTokens(prompt + content);

      logger.info('HuggingFace response received', {
        model: this.model,
        tokensUsed,
        contentLength: content.length,
      });

      return this.formatResponse(content, {
        tokensUsed,
      });
    } catch (error) {
      logger.error('HuggingFace API call failed', {
        error: error.message,
        status: error.response?.status,
        model: this.model,
      });
      throw error;
    }
  }

  /**
   * Get provider info
   * @returns {object} Provider information
   */
  getInfo() {
    return {
      ...super.getInfo(),
      provider: this.provider,
      hasApiKey: !!this.apiKey,
    };
  }
}

module.exports = FallbackProvider;
