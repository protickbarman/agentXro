const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const toolRegistry = require('../tools/ToolRegistry');
const ToolExecution = require('../models/ToolExecution');
const { authMiddleware } = require('../middleware/auth');

/**
 * Get all available tools
 */
router.get('/', (req, res) => {
  try {
    const schemas = toolRegistry.getSchemas();

    res.json({
      success: true,
      data: schemas,
      count: schemas.length,
    });
  } catch (error) {
    logger.error('Failed to get tools', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get tool schema
 */
router.get('/:toolName/schema', (req, res) => {
  try {
    const { toolName } = req.params;

    if (!toolRegistry.has(toolName)) {
      return res.status(404).json({
        success: false,
        error: `Tool '${toolName}' not found`,
      });
    }

    const schema = toolRegistry.getSchema(toolName);

    res.json({
      success: true,
      data: schema,
    });
  } catch (error) {
    logger.error('Failed to get tool schema', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Execute a tool (requires authentication)
 */
router.post('/:toolName/execute', authMiddleware, async (req, res) => {
  try {
    const { toolName } = req.params;
    const { params } = req.body;
    const userId = req.user.id;

    if (!toolRegistry.has(toolName)) {
      return res.status(404).json({
        success: false,
        error: `Tool '${toolName}' not found`,
      });
    }

    logger.debug('Executing tool', { toolName, userId });

    const tool = toolRegistry.get(toolName);
    const startTime = Date.now();

    try {
      const result = await tool.execute(params || {});
      const executionTime = Date.now() - startTime;

      logger.info('Tool executed successfully', {
        toolName,
        userId,
        executionTime,
      });

      res.json({
        success: true,
        data: result,
        executionTime,
      });
    } catch (toolError) {
      const executionTime = Date.now() - startTime;

      logger.error('Tool execution failed', {
        toolName,
        userId,
        error: toolError.message,
        executionTime,
      });

      res.status(400).json({
        success: false,
        error: toolError.message,
        toolName,
      });
    }
  } catch (error) {
    logger.error('Failed to execute tool', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get tool execution history (requires authentication)
 */
router.get('/executions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    logger.debug('Fetching tool executions', { userId });

    // TODO: Implement tool execution history query
    // This would need a method in ToolExecution model to find by user
    res.json({
      success: true,
      data: [],
      count: 0,
    });
  } catch (error) {
    logger.error('Failed to get tool executions', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
