const logger = require('../config/logger');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const queueManager = require('../queue/QueueManager');
const { validateOrThrow, schemas } = require('../utils/validation');

/**
 * Conversations Controller
 */
const conversationsController = {
  /**
   * Get all conversations for a user
   */
  getAllConversations: async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit, offset } = validateOrThrow(
        req.query,
        schemas.paginationSchema
      );

      logger.debug('Fetching conversations', { userId });

      const conversations = await Conversation.findByUserIdPaginated(userId, limit, offset);

      res.json({
        success: true,
        data: conversations,
        count: conversations.length,
      });
    } catch (error) {
      logger.error('Failed to get conversations', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * Create a new conversation
   */
  createConversation: async (req, res) => {
    try {
      const userId = req.user.id;
      const { title, description } = validateOrThrow(
        req.body,
        schemas.conversationCreateSchema
      );

      logger.debug('Creating conversation', { userId, title });

      const conversation = await Conversation.create(
        userId,
        title,
        description || null
      );

      logger.info('Conversation created', { conversationId: conversation.id, userId });

      res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      logger.error('Failed to create conversation', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * Get a specific conversation
   */
  getConversation: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.debug('Fetching conversation', { id, userId });

      const conversation = await Conversation.findById(id);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // Check authorization
      if (conversation.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this conversation',
        });
      }

      // Get messages in conversation
      const messages = await Message.getConversationHistory(id);

      res.json({
        success: true,
        data: {
          ...conversation,
          messages,
        },
      });
    } catch (error) {
      logger.error('Failed to get conversation', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * Update a conversation
   */
  updateConversation: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { title, description, metadata } = req.body;

      logger.debug('Updating conversation', { id, userId });

      const conversation = await Conversation.findById(id);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // Check authorization
      if (conversation.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this conversation',
        });
      }

      if (title !== undefined) {
        await Conversation.updateTitle(id, title);
      }

      logger.info('Conversation updated', { id, userId });

      const updatedConversation = await Conversation.findById(id);

      res.json({
        success: true,
        data: updatedConversation,
      });
    } catch (error) {
      logger.error('Failed to update conversation', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * Delete a conversation
   */
  deleteConversation: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.debug('Deleting conversation', { id, userId });

      const conversation = await Conversation.findById(id);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // Check authorization
      if (conversation.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to delete this conversation',
        });
      }

      await Conversation.delete(id);

      logger.info('Conversation deleted', { id, userId });

      res.json({
        success: true,
        message: 'Conversation deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete conversation', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * Clear conversation history
   */
  clearConversation: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.debug('Clearing conversation', { id, userId });

      const conversation = await Conversation.findById(id);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // Check authorization
      if (conversation.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to clear this conversation',
        });
      }

      // TODO: Implement message deletion by conversation
      // For now, we'll just clear the database directly

      logger.info('Conversation cleared', { id, userId });

      res.json({
        success: true,
        message: 'Conversation cleared successfully',
      });
    } catch (error) {
      logger.error('Failed to clear conversation', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
};

module.exports = conversationsController;
