const logger = require('../config/logger');
const toolRegistry = require('../tools/ToolRegistry');
const CalculatorTool = require('../tools/shared/CalculatorTool');
const BasicWebSearchTool = require('../tools/shared/BasicWebSearchTool');
const JSONParserTool = require('../tools/shared/JSONParserTool');
const TimerTool = require('../tools/shared/TimerTool');

/**
 * Initialize all tools
 */
async function initializeTools() {
  try {
    logger.info('Initializing tools...');

    // Register shared tools
    toolRegistry.register('calculator', new CalculatorTool());
    toolRegistry.register('web_search', new BasicWebSearchTool());
    toolRegistry.register('json_parser', new JSONParserTool());
    toolRegistry.register('timer', new TimerTool());

    logger.info('Tools initialized', { toolNames: toolRegistry.getNames() });
    return toolRegistry;
  } catch (error) {
    logger.error('Failed to initialize tools', { error: error.message });
    throw error;
  }
}

module.exports = { initializeTools };
