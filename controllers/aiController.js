const logger = require('../config/logger');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const agentRegistry = require('../agents/AgentRegistry');
const queueManager = require('../queue/QueueManager');
const { validateOrThrow, schemas } = require('../utils/validation');

/**
 * AI Chat Controller - /new endpoint
 * Simple endpoint for AI UI to send messages and get responses
 */
const aiController = {
  /**
   * POST /new
   * Send a message to AI — returns immediately, all results stream via WS
   * Requires: JWT authentication
   * Body: { message: string, conversationId?: string }
   */
  sendMessage: async (req, res) => {
    const userId = req.user.id;

    try {
      const { message, conversationId } = validateOrThrow(
        req.body,
        schemas.aiChatSchema
      );

      logger.debug('AI chat request', { userId, conversationId });

      let convId = conversationId;
      let isNew = false;

      // Don't await DB check - validate async in background
      if (convId) {
        // Fire-and-forget validation
        Conversation.findById(convId)
          .then(conv => {
            if (!conv) {
              logger.warn('Conversation not found, using provided ID', { convId });
            } else if (conv.user_id !== userId) {
              logger.warn('Unauthorized conversation access attempt', { convId, userId });
            } else {
              // Valid conversation - subscribe to WS
              if (global.subscribeUserToConversation) {
                global.subscribeUserToConversation(userId, conv.id);
              }
            }
          })
          .catch(err => {
            logger.warn('Conversation validation failed', { error: err.message, convId });
          });
      } else {
        // Generate new conversation ID
        const { v4: uuidv4 } = require('uuid');
        convId = uuidv4();
        isNew = true;

        // Queue conversation creation - fire and forget
        const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
        queueManager.addJob('saveConversation', {
          id: convId,
          userId,
          title,
        }).catch(err => logger.error('Failed to queue conversation creation', { error: err.message }));

        logger.info('Auto-created conversation', { conversationId: convId, userId });
      }

      // Auto-subscribe user's WS to this conversation
      if (global.subscribeUserToConversation) {
        global.subscribeUserToConversation(userId, convId);
      }

      // Queue user message save - fire and forget
      queueManager.addJob('saveMessage', {
        conversationId: convId,
        userId,
        role: 'user',
        content: message.trim(),
        metadata: { source: 'ai_ui' },
      }).catch(err => logger.warn('Failed to queue message save', { error: err.message }));

      // Return immediately — all further results come via WS
      res.status(202).json({
        success: true,
        data: {
          conversationId: convId,
          status: 'processing',
          userMessage: {
            role: 'user',
            content: message.trim(),
            createdAt: new Date().toISOString(),
          },
        },
      });

      // Process agent in background (fire-and-forget)
      _processAgentAsync(req, { id: convId }, userId, message);

    } catch (agentError) {
      logger.error('AI request setup failed', { error: agentError.message });
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: agentError.message });
      }
    }
  },

  /**
   * GET /new
   * Get recent conversations for quick access
   */
  getRecentConversations: async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit = 10 } = req.query;

      const conversations = await Conversation.findByUserIdPaginated(userId, parseInt(limit), 0);

      res.json({
        success: true,
        data: conversations,
        count: conversations.length,
      });
    } catch (error) {
      logger.error('Failed to get recent conversations', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
};

/**
 * Process agent in background — all results broadcast via WS only
 */
async function _processAgentAsync(req, conversation, userId, message) {
  try {
    const mainAgent = agentRegistry.getMainAgent();
    const llmManager = req.app.locals.llmManager;

    if (!llmManager) {
      if (global.broadcastToConversation) {
        global.broadcastToConversation(conversation.id, {
          type: 'final_result', conversationId: conversation.id,
          content: 'Error: LLM Manager not initialized', agentType: 'error',
          tokensUsed: 0, files: [], timestamp: Date.now(),
        });
      }
      return;
    }

    const messages = await Message.getConversationHistory(conversation.id);
    const conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));

    const agentResponse = await Promise.race([
      mainAgent.execute({
        userMessage: message, conversationHistory,
        conversationId: conversation.id, userId,
        llmManager,
        serverBaseUrl: `${req.protocol}://${req.get('host')}`,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Agent execution timeout (150s)')), 150000)
      ),
    ]);

    // Extract result fields
    const responseData = agentResponse.data || agentResponse;
    const responseText = responseData.response || responseData.content || 'Unable to process request';
    const agentType = responseData.type || 'unknown';
    const tokensUsed = responseData.tokensUsed || 0;
    const files = responseData.files || responseData.downloadUrls || [];
    const reasoning = responseData.reasoningContent || '';

    // Broadcast final result via WS — simple format for UI
    if (global.broadcastToConversation) {
      global.broadcastToConversation(conversation.id, {
        type: 'final_result', conversationId: conversation.id,
        content: responseText, agentType, tokensUsed, files, reasoning,
        timestamp: Date.now(),
      });
    }

    // Persist assistant message with full NVIDIA-style metadata for DB
    try {
      const dbMetadata = {
        agentType, tokensUsed, source: 'ai_ui',
        id: responseData.id,
        object: responseData.object,
        model: responseData.model,
        choices: responseData.choices,
        usage: responseData.usage,
        reasoningContent: reasoning,
      };
      const assistantMessage = await Message.create(conversation.id, 'agent', responseText, dbMetadata);
      await queueManager.addJob('saveMessage', {
        conversationId: conversation.id, userId, role: 'agent',
        content: assistantMessage.content, metadata: dbMetadata,
      });
    } catch (e) {
      logger.warn('Failed to save assistant message', { error: e.message });
    }

    logger.info('AI chat completed via WS', { conversationId: conversation.id, userId, agentType });
  } catch (agentError) {
    logger.error('AI agent execution failed', { error: agentError.message });
    if (global.broadcastToConversation) {
      global.broadcastToConversation(conversation.id, {
        type: 'final_result', conversationId: conversation.id,
        content: `Error: ${agentError.message}`, agentType: 'error',
        tokensUsed: 0, files: [], timestamp: Date.now(),
      });
    }
  }
}

module.exports = aiController;
