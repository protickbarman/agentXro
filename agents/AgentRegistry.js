const logger = require('../config/logger');

/**
 * Agent Registry
 * Manages registration and lookup of all agents
 */
class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.mainAgent = null;
  }

  /**
   * Register an agent
   * @param {string} name - Agent name
   * @param {Agent} agentInstance - Agent instance
   */
  async register(name, agentInstance) {
    if (this.agents.has(name)) {
      logger.warn(`Agent ${name} already registered, overwriting`);
    }

    // Initialize agent
    await agentInstance.initialize();

    this.agents.set(name, agentInstance);
    logger.info(`Agent registered: ${name}`);
  }

  /**
   * Set main agent
   * @param {Agent} agentInstance - Main agent instance
   */
  async setMainAgent(agentInstance) {
    await this.register('main', agentInstance);
    this.mainAgent = agentInstance;
    logger.info('Main agent set');
  }

  /**
   * Get an agent by name
   * @param {string} name - Agent name
   * @returns {Agent} Agent instance
   */
  get(name) {
    const agent = this.agents.get(name);
    if (!agent) {
      throw new Error(`Agent '${name}' not found in registry`);
    }
    return agent;
  }

  /**
   * Get main agent
   * @returns {Agent} Main agent instance
   */
  getMainAgent() {
    if (!this.mainAgent) {
      throw new Error('Main agent not set');
    }
    return this.mainAgent;
  }

  /**
   * Check if agent exists
   * @param {string} name - Agent name
   * @returns {boolean}
   */
  has(name) {
    return this.agents.has(name);
  }

  /**
   * Get all agents
   * @returns {Map} All registered agents
   */
  getAll() {
    return this.agents;
  }

  /**
   * Get all agent names
   * @returns {string[]} Array of agent names
   */
  getNames() {
    return Array.from(this.agents.keys());
  }

  /**
   * Get all agents info
   * @returns {array} Array of agent information
   */
  getInfo() {
    return Array.from(this.agents.values()).map(agent => agent.getCapabilities());
  }

  /**
   * Get registry metrics
   * @returns {object} Registry metrics
   */
  getMetrics() {
    return {
      totalAgents: this.agents.size,
      agentNames: this.getNames(),
      mainAgentName: this.mainAgent?.name || null,
      agents: this.getInfo(),
    };
  }

  /**
   * Clear registry
   */
  clear() {
    this.agents.clear();
    this.mainAgent = null;
    logger.info('Agent registry cleared');
  }
}

// Create singleton instance
const agentRegistry = new AgentRegistry();

module.exports = agentRegistry;
