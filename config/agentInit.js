const logger = require('./logger');
const agentRegistry = require('../agents/AgentRegistry');
const toolRegistry = require('../tools/ToolRegistry');
const MainAgent = require('../agents/main/MainAgent');
const WebAgent = require('../agents/web/WebAgent');
const CodeAgent = require('../agents/code/CodeAgent');
const DatabaseAgent = require('../agents/database/DatabaseAgent');
const SearchAgent = require('../agents/search/SearchAgent');

/**
 * Initialize all agents
 * @param {LLMManager} llmManager - LLM manager instance
 */
async function initializeAgents(llmManager) {
  try {
    logger.info('Initializing agents...');

    // Create and register main agent (needs toolRegistry + agentRegistry)
    const mainAgent = new MainAgent(llmManager, toolRegistry, agentRegistry);
    await agentRegistry.setMainAgent(mainAgent);

    // Create and register sub-agents (with toolRegistry)
    const webAgent = new WebAgent(llmManager, toolRegistry);
    await agentRegistry.register('web', webAgent);

    const codeAgent = new CodeAgent(llmManager, toolRegistry);
    await agentRegistry.register('code', codeAgent);

    const databaseAgent = new DatabaseAgent(llmManager, toolRegistry);
    await agentRegistry.register('database', databaseAgent);

    const searchAgent = new SearchAgent(llmManager, toolRegistry);
    await agentRegistry.register('search', searchAgent);

    logger.info('Agents initialized', { agentNames: agentRegistry.getNames() });
    return agentRegistry;
  } catch (error) {
    logger.error('Failed to initialize agents', { error: error.message });
    throw error;
  }
}

module.exports = { initializeAgents };
