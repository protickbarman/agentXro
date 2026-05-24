const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const { authMiddleware } = require('../middleware/auth');
const queueManager = require('../queue/QueueManager');
const agentRegistry = require('../agents/AgentRegistry');

/**
 * Get usage analytics (requires authentication)
 */
router.get('/usage', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    logger.debug('Fetching usage analytics', { userId });

    // Get queue stats
    const queueStats = await queueManager.getStats();

    res.json({
      success: true,
      data: {
        queueStats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get usage analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get agent analytics
 */
router.get('/agents', authMiddleware, async (req, res) => {
  try {
    logger.debug('Fetching agent analytics');

    const metrics = agentRegistry.getMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Failed to get agent analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get tool analytics
 */
router.get('/tools', authMiddleware, async (req, res) => {
  try {
    logger.debug('Fetching tool analytics');

    res.json({
      success: true,
      data: {
        message: 'Tool analytics not yet implemented',
      },
    });
  } catch (error) {
    logger.error('Failed to get tool analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
