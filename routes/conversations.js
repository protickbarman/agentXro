const express = require('express');
const logger = require('../config/logger');
const { authMiddleware } = require('../middleware/auth');
const Conversation = require('../models/Conversation');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const conversations = await Conversation.findByUserIdPaginated(req.user.id, limit, offset);
    res.json({ data: conversations });
  } catch (err) {
    logger.error('Error listing conversations', { error: err.message });
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await Conversation.delete(req.params.id);
    res.json({ data: { deleted: true } });
  } catch (err) {
    logger.error('Error deleting conversation', { error: err.message });
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

module.exports = router;
