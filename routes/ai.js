const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authMiddleware } = require('../middleware/auth');

// All /new routes require authentication
router.use(authMiddleware);

// POST /new - Send message to AI
router.post('/', aiController.sendMessage);

// GET /new - Get recent conversations
router.get('/', aiController.getRecentConversations);



module.exports = router;
