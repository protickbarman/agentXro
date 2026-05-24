const logger = require('../../config/logger');
const { AgentExecutionError } = require('../../utils/errorTypes');

/**
 * Base Agent class
 * All agents should extend this class
 */
class Agent {
  constructor(name, type = 'base') {
    this.name = name;
    this.type = type;
    this.llmProvider = null;
    this.tools = [];
    this.maxRetries = 3;
    this.timeout = 25000;
  }

  /**
   * Initialize agent
   * @param {object} config - Configuration
   */
  async initialize(config = {}) {
    logger.info(`Initializing agent: ${this.name}`);
    this.config = config;
  }

  /**
   * Set LLM provider
   * @param {LLMProvider} provider - LLM provider instance
   */
  setLLMProvider(provider) {
    this.llmProvider = provider;
  }

  /**
   * Register tool for this agent
   * @param {Tool} tool - Tool instance
   */
  registerTool(tool) {
    this.tools.push(tool);
    logger.info(`Tool registered for agent ${this.name}: ${tool.name}`);
  }

  /**
   * Get agent capabilities
   * @returns {object} Agent capabilities
   */
  getCapabilities() {
    return {
      name: this.name,
      type: this.type,
      tools: this.tools.map(t => t.name),
      supportsParallel: false,
    };
  }

  /**
   * Execute agent
   * @param {object} context - Execution context
   * @returns {Promise} Execution result
   */
  async execute(context) {
    throw new Error(`Agent ${this.name} must implement execute method`);
  }

  /**
   * Communicate with another agent
   * @param {Agent} targetAgent - Target agent
   * @param {object} message - Message to send
   * @returns {Promise} Response from target agent
   */
  async sendMessage(targetAgent, message) {
    logger.info(`Agent ${this.name} sending message to ${targetAgent.name}`);
    return await targetAgent.receiveMessage(this, message);
  }

  /**
   * Receive message from another agent
   * @param {Agent} sourceAgent - Source agent
   * @param {object} message - Message received
   * @returns {Promise} Response
   */
  async receiveMessage(sourceAgent, message) {
    logger.info(`Agent ${this.name} received message from ${sourceAgent.name}`);
    return { success: true, data: null };
  }

  /**
   * Format success response
   * @param {any} data - Result data
   * @param {string} message - Message
   * @returns {object} Formatted response
   */
  formatResponse(data, message = 'Success') {
    return {
      success: true,
      message,
      data,
      agent: this.name,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format error response
   * @param {Error} error - Error object
   * @returns {object} Formatted error response
   */
  formatError(error) {
    return {
      success: false,
      error: error.message,
      agent: this.name,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = Agent;
