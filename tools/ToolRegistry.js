const logger = require('../config/logger');

/**
 * Tool Registry
 * Manages registration and lookup of all tools
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a tool
   * @param {string} name - Tool name
   * @param {Tool} toolInstance - Tool instance
   */
  register(name, toolInstance) {
    if (this.tools.has(name)) {
      logger.warn(`Tool ${name} already registered, overwriting`);
    }

    this.tools.set(name, toolInstance);
    logger.info(`Tool registered: ${name}`);
  }

  /**
   * Get a tool by name
   * @param {string} name - Tool name
   * @returns {Tool} Tool instance
   */
  get(name) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found in registry`);
    }
    return tool;
  }

  /**
   * Check if tool exists
   * @param {string} name - Tool name
   * @returns {boolean}
   */
  has(name) {
    return this.tools.has(name);
  }

  /**
   * Get all tools
   * @returns {Map} All registered tools
   */
  getAll() {
    return this.tools;
  }

  /**
   * Get all tool names
   * @returns {string[]} Array of tool names
   */
  getNames() {
    return Array.from(this.tools.keys());
  }

  /**
   * Get all tools schemas
   * @returns {array} Array of tool schemas
   */
  getSchemas() {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * Get tool schema
   * @param {string} name - Tool name
   * @returns {object} Tool schema
   */
  getSchema(name) {
    const tool = this.get(name);
    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    };
  }

  /**
   * Clear registry
   */
  clear() {
    this.tools.clear();
    logger.info('Tool registry cleared');
  }
}

// Create singleton instance
const toolRegistry = new ToolRegistry();

module.exports = toolRegistry;
