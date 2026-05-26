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
   * Get all tools schemas in OpenAI format
   * @returns {array} Array of tool schemas [{type:'function', function:{name, description, parameters}}]
   */
  getSchemas() {
    return Array.from(this.tools.values()).map(tool => {
      const s = tool.getSchema();
      return {
        type: 'function',
        function: {
          name: s.name,
          description: s.description,
          parameters: s.parameters,
        },
      };
    });
  }

  /**
   * Get tool schema in OpenAI format
   * @param {string} name - Tool name
   * @returns {object} Tool schema
   */
  getSchema(name) {
    const s = this.get(name).getSchema();
    return {
      type: 'function',
      function: {
        name: s.name,
        description: s.description,
        parameters: s.parameters,
      },
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
