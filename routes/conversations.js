const express = require('express');
const router = express.Router();
const conversationsController = require('../controllers/conversationsController');
const { authMiddleware } = require('../middleware/auth');

// All conversation routes require authentication
router.use(authMiddleware);

// Get all conversations
router.get('/', conversationsController.getAllConversations);

// Create new conversation
router.post('/', conversationsController.createConversation);

// Get specific conversation
router.get('/:id', conversationsController.getConversation);

// Update conversation
router.put('/:id', conversationsController.updateConversation);

// Delete conversation
router.delete('/:id', conversationsController.deleteConversation);

// Clear conversation history
router.post('/:id/clear', conversationsController.clearConversation);

module.exports = router;
