/**
 * Base Agent Configuration class
 * Provides configuration management for agents
 */
class AgentConfig {
  constructor(name, type = 'base') {
    this.name = name;
    this.type = type;
    this.enabled = true;
    this.priority = 0;
    this.timeout = 25000;
    this.maxRetries = 3;
    this.metadata = {};
  }

  /**
   * Load configuration from object
   * @param {object} config - Configuration object
   */
  load(config) {
    Object.assign(this, config);
  }

  /**
   * Get configuration as object
   * @returns {object} Configuration
   */
  toObject() {
    return {
      name: this.name,
      type: this.type,
      enabled: this.enabled,
      priority: this.priority,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      metadata: this.metadata,
    };
  }

  /**
   * Validate configuration
   * @returns {boolean} Is valid
   */
  validate() {
    if (!this.name) throw new Error('Agent name is required');
    if (this.timeout < 1000) throw new Error('Timeout must be at least 1000ms');
    if (this.maxRetries < 0) throw new Error('Max retries cannot be negative');
    return true;
  }
}

module.exports = AgentConfig;
