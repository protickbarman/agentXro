const logger = require('../../config/logger');
const env = require('../../config/env');
const NIMProvider = require('./NIMProvider');
const CloudflareProvider = require('./CloudflareProvider');
const AccountManager = require('./AccountManager');
const FallbackProvider = require('./FallbackProvider');

/**
 * LLM Manager
 * Orchestrates between multiple LLM providers with fallback logic
 */
class LLMManager {
  constructor() {
    this.providers = new Map();
    this.primaryProvider = null;
    this.fallbackProviders = [];
    this.totalTokensUsed = 0;
    this.accountManager = null;
  }

  /**
   * Initialize LLM manager
   * @returns {Promise}
   */
  async initialize() {
    logger.info('Initializing LLM Manager');

    // Try Cloudflare first (primary) if accounts configured
    if (env.CLOUDFLARE.accounts && env.CLOUDFLARE.accounts.length > 0) {
      try {
        this.accountManager = new AccountManager(env.CLOUDFLARE.accounts);
        const cfProvider = new CloudflareProvider({
          accountManager: this.accountManager,
          defaultModel: env.CLOUDFLARE.defaultModel,
          fallbackModel: env.CLOUDFLARE.fallbackModel,
        });
        await cfProvider.initialize();
        this.providers.set('cloudflare', cfProvider);
        this.primaryProvider = cfProvider;
        logger.info('Cloudflare provider initialized as primary', {
          accounts: env.CLOUDFLARE.accounts.length,
        });
      } catch (error) {
        logger.warn('Failed to initialize Cloudflare provider', { error: error.message });
      }
    }

    // If no Cloudflare primary, try NVIDIA NIM
    if (!this.primaryProvider) {
      try {
        const nimProvider = new NIMProvider({
          apiKey: env.NIM.apiKey,
          baseUrl: env.NIM.baseUrl,
          model: env.NIM.model,
        });
        await nimProvider.initialize();
        this.providers.set('nim', nimProvider);
        this.primaryProvider = nimProvider;
        logger.info('NVIDIA NIM provider initialized as primary');
      } catch (error) {
        logger.warn('Failed to initialize NVIDIA NIM provider', { error: error.message });
      }
    } else {
      // Cloudflare is primary, add NIM as fallback
      try {
        const nimProvider = new NIMProvider({
          apiKey: env.NIM.apiKey,
          baseUrl: env.NIM.baseUrl,
          model: env.NIM.model,
        });
        await nimProvider.initialize();
        this.providers.set('nim', nimProvider);
        this.fallbackProviders.push(nimProvider);
        logger.info('NVIDIA NIM provider initialized as fallback');
      } catch (error) {
        logger.warn('Failed to initialize NVIDIA NIM fallback', { error: error.message });
      }
    }

    try {
      // Initialize Fallback LLM
      const fallbackProvider = new FallbackProvider({
        provider: env.FALLBACK_LLM.provider,
        apiKey: env.FALLBACK_LLM.key,
        model: env.FALLBACK_LLM.model,
      });
      await fallbackProvider.initialize();
      this.providers.set('fallback', fallbackProvider);
      this.fallbackProviders.push(fallbackProvider);
      logger.info('Fallback LLM provider initialized');
    } catch (error) {
      logger.warn('Failed to initialize fallback LLM provider', { error: error.message });
    }

    if (!this.primaryProvider && this.fallbackProviders.length === 0) {
      throw new Error('No LLM providers available');
    }
  }

  /**
   * Initialize LLM manager
   * @returns {Promise}
   */
  async initialize() {
    logger.info('Initializing LLM Manager');

    try {
      // Initialize NVIDIA NIM (Primary)
      const nimProvider = new NIMProvider({
        apiKey: env.NIM.apiKey,
        baseUrl: env.NIM.baseUrl,
        model: env.NIM.model,
      });
      await nimProvider.initialize();
      this.providers.set('nim', nimProvider);
      this.primaryProvider = nimProvider;
      logger.info('NVIDIA NIM provider initialized as primary');
    } catch (error) {
      logger.warn('Failed to initialize NVIDIA NIM provider', { error: error.message });
    }

    try {
      // Initialize Fallback LLM
      const fallbackProvider = new FallbackProvider({
        provider: env.FALLBACK_LLM.provider,
        apiKey: env.FALLBACK_LLM.apiKey,
        model: env.FALLBACK_LLM.model,
      });
      await fallbackProvider.initialize();
      this.providers.set('fallback', fallbackProvider);
      this.fallbackProviders.push(fallbackProvider);
      logger.info('Fallback LLM provider initialized');
    } catch (error) {
      logger.warn('Failed to initialize fallback LLM provider', { error: error.message });
    }

    if (!this.primaryProvider && this.fallbackProviders.length === 0) {
      throw new Error('No LLM providers available');
    }
  }

  /**
   * Send chat request with fallback logic
   * @param {string} prompt - User prompt
   * @param {array} conversationHistory - Previous messages
   * @param {object} options - Additional options
   * @returns {Promise} Response with provider info
   */
  async chat(prompt, conversationHistory = [], options = {}) {
    const providers = this._getProviderChain();

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      try {
        logger.info(`Attempting chat with provider: ${provider.name}`);
        const response = await provider.chat(prompt, conversationHistory, options);

        // Track token usage
        if (response.tokensUsed) {
          this.totalTokensUsed += response.tokensUsed;
        }

        logger.info(`Chat successful with ${provider.name}`, {
          tokensUsed: response.tokensUsed,
          totalTokens: this.totalTokensUsed,
        });

        return {
          ...response,
          provider: provider.name,
          attempt: i + 1,
        };
      } catch (error) {
        logger.warn(`Provider ${provider.name} failed`, {
          error: error.message,
          attempt: i + 1,
          totalProviders: providers.length,
        });

        // If this is the last provider, throw error
        if (i === providers.length - 1) {
          throw new Error(`All LLM providers failed. Last error: ${error.message}`);
        }

        // Continue to next provider
      }
    }

    throw new Error('No LLM providers available');
  }

  /**
   * Get provider chain (primary + fallbacks)
   * @private
   * @returns {array} Array of providers to try in order
   */
  _getProviderChain() {
    const chain = [];

    if (this.primaryProvider) {
      chain.push(this.primaryProvider);
    }

    chain.push(...this.fallbackProviders);

    return chain;
  }

  /**
   * Hot-reload Cloudflare accounts
   * @param {Array} accounts - Array of { accountId, apiToken, model }
   */
  setCloudflareAccounts(accounts) {
    this.accountManager = new AccountManager(accounts);

    const cfProvider = this.providers.get('cloudflare');
    if (cfProvider) {
      cfProvider.accountManager = this.accountManager;
      logger.info('Cloudflare accounts hot-reloaded', { count: accounts.length });
    } else {
      const CloudflareProvider = require('./CloudflareProvider');
      const newProvider = new CloudflareProvider({
        accountManager: this.accountManager,
        defaultModel: env.CLOUDFLARE.defaultModel,
        fallbackModel: env.CLOUDFLARE.fallbackModel,
      });
      newProvider.initialize().catch(() => {});
      this.providers.set('cloudflare', newProvider);
      this.primaryProvider = newProvider;
      logger.info('Cloudflare provider added with accounts', { count: accounts.length });
    }
  }

  /**
   * Create a provider with a specific model
   * @param {string} model - Model ID
   * @param {object} extra - Additional options
   * @returns {BaseProvider} Provider instance
   */
  createProvider(model, extra = {}) {
    if (extra.provider === 'cloudflare') {
      const CloudflareProvider = require('./CloudflareProvider');
      const AccountManager = require('./AccountManager');
      const am = new AccountManager(extra.accounts || env.CLOUDFLARE.accounts || []);
      return new CloudflareProvider({
        accountManager: am,
        defaultModel: model,
        fallbackModel: extra.fallbackModel || env.CLOUDFLARE.fallbackModel,
        timeout: extra.timeout || 120000,
        maxRetries: extra.maxRetries ?? 2,
        ...extra,
      });
    }
    const NIMProvider = require('./NIMProvider');
    return new NIMProvider({
      apiKey: env.NIM.apiKey,
      baseUrl: env.NIM.baseUrl,
      model,
      timeout: extra.timeout || 120000,
      maxRetries: extra.maxRetries ?? 2,
      ...extra,
    });
  }

  /**
   * Register a provider
   * @param {string} name - Provider name
   * @param {BaseProvider} provider - Provider instance
   */
  registerProvider(name, provider) {
    this.providers.set(name, provider);
    logger.info(`Provider registered: ${name}`);
  }

  /**
   * Set primary provider
   * @param {string} name - Provider name
   */
  setPrimaryProvider(name) {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} not found`);
    }
    this.primaryProvider = provider;
    logger.info(`Primary provider set to: ${name}`);
  }

  /**
   * Add fallback provider
   * @param {string} name - Provider name
   */
  addFallbackProvider(name) {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} not found`);
    }
    this.fallbackProviders.push(provider);
    logger.info(`Fallback provider added: ${name}`);
  }

  /**
   * Get all providers info
   * @returns {array} Array of provider info
   */
  getProvidersInfo() {
    return Array.from(this.providers.values()).map(provider => provider.getInfo());
  }

  /**
   * Get manager stats
   * @returns {object} Manager statistics
   */
  getStats() {
    const cfStatus = this.accountManager ? this.accountManager.getStatus() : null;
    return {
      totalTokensUsed: this.totalTokensUsed,
      providersCount: this.providers.size,
      primaryProvider: this.primaryProvider?.name || null,
      fallbackProviders: this.fallbackProviders.map(p => p.name),
      providers: this.getProvidersInfo(),
      cloudflareAccounts: cfStatus,
    };
  }

  /**
   * Reset stats
   */
  resetStats() {
    this.totalTokensUsed = 0;
    logger.info('LLM Manager stats reset');
  }
}

// Create singleton instance
const llmManager = new LLMManager();

module.exports = llmManager;
