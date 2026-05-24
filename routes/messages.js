const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const { authMiddleware } = require('../middleware/auth');

// All message routes require authentication
router.use(authMiddleware);

// Get messages in a conversation
router.get('/:conversationId/messages', messagesController.getMessages);

// Create new message (user query)
router.post('/:conversationId/messages', messagesController.createMessage);

// Get specific message
router.get('/:conversationId/messages/:messageId', messagesController.getMessage);

// Delete message
router.delete('/:conversationId/messages/:messageId', messagesController.deleteMessage);

module.exports = router;
