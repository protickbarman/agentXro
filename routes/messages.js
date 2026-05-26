const express = require('express');
const logger = require('../config/logger');
const { authMiddleware } = require('../middleware/auth');
const Message = require('../models/Message');

const router = express.Router();

router.get('/:convId/messages', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const messages = await Message.findByConversationIdPaginated(req.params.convId, limit, offset);
    messages.reverse();
    res.json({ data: messages });
  } catch (err) {
    logger.error('Error getting messages', { error: err.message });
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

module.exports = router;
