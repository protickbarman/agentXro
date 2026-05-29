const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const logger = require('../config/logger');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

class JobProcessor {
  /* ── Conversations → MongoDB (uses the ID the route already sent to the client) ── */
  static async processSaveConversation(job) {
    const { id, userId, title, description } = job.data;
    await Conversation.create(userId, title, description, id);
    logger.info('Conversation saved via queue (MongoDB)', { conversationId: id });
    return { conversationId: id };
  }

  /* ── Messages → MongoDB ── */
  static async processSaveMessage(job) {
    const { conversationId, role, content, metadata, reasoningSteps, toolCalls } = job.data;
    const msg = await Message.create(
      conversationId, role, content || '',
      metadata || {}, reasoningSteps || [], toolCalls || []
    );
    logger.info('Message saved via queue (MongoDB)', { conversationId, role, messageId: msg.id });
    return { messageId: msg.id, conversationId, role };
  }

  /* ── Tool executions → MongoDB ── */
  static async processSaveToolExecution(job) {
    const { conversationId, toolName, input, output, duration, status } = job.data;
    const id = uuidv4();
    try {
      const { mongoose } = require('../config/mongodb');
      const ToolExecModel = mongoose.models.ToolExecution;
      if (ToolExecModel) {
        await ToolExecModel.create({
          _id: id, conversation_id: conversationId,
          tool_name: toolName, input: input || {}, output: output || null,
          duration_ms: duration || 0, status: status || 'completed',
          created_at: new Date(), completed_at: new Date(),
        });
      }
    } catch (err) {
      logger.warn('Tool execution save failed', { error: err.message });
    }
    return { executionId: id };
  }

  /* ── Agent executions → MongoDB ── */
  static async processSaveAgentExecution(job) {
    const { conversationId, agentName, input, output, duration, status, parentExecutionId } = job.data;
    const id = uuidv4();
    try {
      const { mongoose } = require('../config/mongodb');
      const AgentExecModel = mongoose.models.AgentExecution;
      if (AgentExecModel) {
        await AgentExecModel.create({
          _id: id, conversation_id: conversationId,
          agent_name: agentName, input: input || {}, output: output || null,
          duration_ms: duration || 0, status: status || 'completed',
          parent_execution_id: parentExecutionId || null,
          created_at: new Date(), completed_at: new Date(),
        });
      }
    } catch (err) {
      logger.warn('Agent execution save failed', { error: err.message });
    }
    return { executionId: id };
  }

  /* ── Sessions → PostgreSQL (auth stays in PG) ── */
  static async processUpdateSession(job) {
    const { sessionId, data } = job.data;
    await pool.query(
      `UPDATE sessions SET data = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(data), sessionId]
    );
    return { sessionId };
  }
}

module.exports = JobProcessor;
