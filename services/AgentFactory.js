const logger = require('../config/logger');
const agentRegistry = require('../agents/AgentRegistry');
const Agent = require('../agents/base/Agent');

/**
 * AgentFactory - Creates agent instances from definitions
 * Part of Agent Creation & Management skill
 */
class AgentFactory {
  constructor() {
    this.templates = new Map();
    this._registerDefaultTemplates();
  }

  _registerDefaultTemplates() {
    this.templates.set('default-web-agent', {
      type: 'web',
      config: { timeout: 25000, maxRetries: 3, useSoul: true },
      capabilities: { supportsParallel: false, supportsMemory: true, supportsCommunication: true },
    });

    this.templates.set('default-code-agent', {
      type: 'code',
      config: { timeout: 30000, maxRetries: 3, useSoul: true },
      capabilities: { supportsParallel: false, supportsMemory: true, supportsCommunication: true },
    });

    this.templates.set('default-search-agent', {
      type: 'search',
      config: { timeout: 25000, maxRetries: 3, useSoul: true },
      capabilities: { supportsParallel: false, supportsMemory: true, supportsCommunication: true },
    });

    this.templates.set('default-database-agent', {
      type: 'database',
      config: { timeout: 25000, maxRetries: 3, useSoul: true },
      capabilities: { supportsParallel: false, supportsMemory: true, supportsCommunication: true },
    });
  }

  /**
   * Create an agent from a definition
   * @param {object} definition - Agent definition
   * @returns {Agent} Agent instance
   */
  async createAgent(definition) {
    const { name, type, description, llmConfig, tools, capabilities, config, metadata } = definition;

    if (!name || !type) {
      throw new Error('Agent definition requires name and type');
    }

    const agent = new Agent(name, type);
    agent.description = description || '';

    await agent.initialize(config || {});

    if (capabilities) {
      Object.assign(agent, capabilities);
    }

    if (llmConfig && this.llmManager) {
      const provider = this.llmManager.getProvider(llmConfig.provider);
      if (provider) {
        agent.setLLMProvider(provider);
        if (llmConfig.model) {
          provider.setModel(llmConfig.model);
          provider.setTemperature?.(llmConfig.temperature || 0.3);
          provider.setMaxTokens?.(llmConfig.maxTokens || 4096);
        }
      }
    }

    agent.metadata = metadata || {};
    agent.createdAt = new Date().toISOString();

    logger.info(`Agent created: ${name} (${type})`);
    return agent;
  }

  /**
   * Register a custom template
   * @param {string} name - Template name
   * @param {object} template - Template definition
   */
  registerTemplate(name, template) {
    this.templates.set(name, template);
    logger.info(`Agent template registered: ${name}`);
  }

  /**
   * Get template by name
   * @param {string} name - Template name
   * @returns {object|null}
   */
  getTemplate(name) {
    return this.templates.get(name) || null;
  }

  /**
   * List all templates
   * @returns {Array}
   */
  listTemplates() {
    return Array.from(this.templates.entries()).map(([name, tmpl]) => ({
      name,
      type: tmpl.type,
      capabilities: Object.keys(tmpl.capabilities || {}),
    }));
  }

  /**
   * Create agent from template
   * @param {string} templateName - Template name
   * @param {object} overrides - Field overrides
   * @returns {Agent}
   */
  async createFromTemplate(templateName, overrides = {}) {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const definition = {
      name: overrides.name || `${template.type}-agent-${Date.now()}`,
      type: template.type,
      description: overrides.description || template.type.charAt(0).toUpperCase() + template.type.slice(1) + ' agent',
      llmConfig: overrides.llmConfig || { provider: 'nim' },
      tools: overrides.tools || [],
      capabilities: { ...template.capabilities, ...overrides.capabilities },
      config: { ...template.config, ...overrides.config },
      metadata: overrides.metadata || {},
    };

    return this.createAgent(definition);
  }

  /**
   * Set LLM manager reference
   * @param {object} llmManager
   */
  setLLMManager(llmManager) {
    this.llmManager = llmManager;
  }

  /**
   * Clone an existing agent
   * @param {string} name - New agent name
   * @param {string} sourceName - Source agent name
   * @param {object} overrides - Field overrides
   * @returns {Agent}
   */
  async cloneAgent(name, sourceName, overrides = {}) {
    const source = agentRegistry.get(sourceName);
    if (!source) {
      throw new Error(`Source agent not found: ${sourceName}`);
    }

    const definition = {
      name,
      type: overrides.type || source.type,
      description: overrides.description || source.description,
      llmConfig: overrides.llmConfig || source.llmProvider?.config,
      tools: overrides.tools || source.tools.map(t => t.name),
      capabilities: { ...source.getCapabilities?.(), ...overrides.capabilities },
      config: overrides.config || {},
    };

    return this.createAgent(definition);
  }
}

module.exports = new AgentFactory();
