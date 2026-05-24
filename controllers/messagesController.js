const logger = require('../config/logger');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const agentRegistry = require('../agents/AgentRegistry');
const queueManager = require('../queue/QueueManager');
const { validateOrThrow, schemas } = require('../utils/validation');

/**
 * Messages Controller
 */
const messagesController = {
  /**
   * Get all messages in a conversation
   */
  getMessages: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const { limit, offset } = validateOrThrow(
        req.query,
        schemas.paginationSchema
      );

      logger.debug('Fetching messages', { conversationId, userId });

      // Verify conversation ownership
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      if (conversation.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this conversation',
        });
      }

      const messages = await Message.findByConversationIdPaginated(
        conversationId,
        parseInt(limit),
        parseInt(offset)
      );

      res.json({
        success: true,
        data: messages,
        count: messages.length,
      });
    } catch (error) {
      logger.error('Failed to get messages', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * Create a new message (user query)
   */
  createMessage: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const { content } = validateOrThrow(
        { conversationId, ...req.body },
        schemas.messageCreateSchema
      );

      logger.debug('Creating message', { conversationId, userId });

      // Verify conversation ownership
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      if (conversation.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this conversation',
        });
      }

      // Create user message
      const userMessage = await Message.create(
        conversationId,
        'user',
        content.trim(),
        req.body.metadata || {}
      );

      logger.info('User message created', {
        messageId: userMessage.id,
        conversationId,
        userId,
      });

      // Queue message save (async)
      try {
        await queueManager.addJob('saveMessage', {
          conversationId,
          userId,
          role: 'user',
          content: userMessage.content,
          metadata: req.body.metadata || {},
        });
      } catch (queueError) {
        logger.warn('Failed to queue message save', { error: queueError.message });
      }

      // Get main agent and execute
      try {
        const mainAgent = agentRegistry.getMainAgent();
        const llmManager = req.app.locals.llmManager;

        // Build conversation history
        const messages = await Message.getConversationHistory(conversationId);
        const conversationHistory = messages.map(m => ({
          role: m.role,
          content: m.content,
        }));

        // Execute agent
        const agentResponse = await mainAgent.execute({
          userMessage: content,
          conversationHistory,
          conversationId,
          userId,
          llmManager,
        });

        // Create agent response message with full NVIDIA metadata
        const resData = agentResponse.data || agentResponse;
        const assistantMessage = await Message.create(
          conversationId,
          'agent',
          resData.response || resData.content || 'Unable to process request',
          {
            agentType: resData.type || 'unknown',
            tokensUsed: resData.tokensUsed || 0,
            id: resData.id,
            object: resData.object,
            model: resData.model,
            choices: resData.choices,
            usage: resData.usage,
          }
        );

        logger.info('Agent response created', {
          messageId: assistantMessage.id,
          conversationId,
          agentType: agentResponse.type,
        });

        // Queue agent response save (async)
        try {
          await queueManager.addJob('saveMessage', {
            conversationId,
            userId,
            role: 'agent',
            content: assistantMessage.content,
            metadata: {
              agentType: resData.type || 'unknown',
              tokensUsed: resData.tokensUsed || 0,
              id: resData.id,
              object: resData.object,
              model: resData.model,
              choices: resData.choices,
              usage: resData.usage,
            },
          });
        } catch (queueError) {
          logger.warn('Failed to queue response message save', { error: queueError.message });
        }

        res.status(201).json({
          success: true,
          data: {
            userMessage,
            assistantMessage,
            agentType: agentResponse.type,
          },
        });
      } catch (agentError) {
        logger.error('Agent execution failed', { error: agentError.message });

        // Still return the user message, but indicate agent failed
        res.status(201).json({
          success: true,
          data: { userMessage },
          warning: 'Agent execution failed: ' + agentError.message,
        });
      }
    } catch (error) {
      logger.error('Failed to create message', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * Get a specific message
   */
  getMessage: async (req, res) => {
    try {
      const { conversationId, messageId } = req.params;
      const userId = req.user.id;

      logger.debug('Fetching message', { messageId, conversationId, userId });

      // Verify conversation ownership
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      if (conversation.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this conversation',
        });
      }

      const message = await Message.findById(messageId);

      if (!message || message.conversation_id !== conversationId) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
        });
      }

      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error('Failed to get message', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * Delete a message
   */
  deleteMessage: async (req, res) => {
    try {
      const { conversationId, messageId } = req.params;
      const userId = req.user.id;

      logger.debug('Deleting message', { messageId, conversationId, userId });

      // Verify conversation ownership
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      if (conversation.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this conversation',
        });
      }

      const message = await Message.findById(messageId);

      if (!message || message.conversation_id !== conversationId) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
        });
      }

      await Message.delete(messageId);

      logger.info('Message deleted', { messageId, conversationId, userId });

      res.json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete message', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
};

module.exports = messagesController;
