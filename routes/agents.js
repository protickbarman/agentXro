const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const agentRegistry = require('../agents/AgentRegistry');

/**
 * Get all agents
 */
router.get('/', (req, res) => {
  try {
    const agentInfo = agentRegistry.getInfo();

    res.json({
      success: true,
      data: agentInfo,
      count: agentInfo.length,
    });
  } catch (error) {
    logger.error('Failed to get agents', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get agent statistics and metrics
 */
router.get('/stats', (req, res) => {
  try {
    const metrics = agentRegistry.getMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Failed to get agent stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get specific agent info
 */
router.get('/:agentName', (req, res) => {
  try {
    const { agentName } = req.params;

    if (!agentRegistry.has(agentName)) {
      return res.status(404).json({
        success: false,
        error: `Agent '${agentName}' not found`,
      });
    }

    const agent = agentRegistry.get(agentName);
    const capabilities = agent.getCapabilities();

    res.json({
      success: true,
      data: capabilities,
    });
  } catch (error) {
    logger.error('Failed to get agent', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
