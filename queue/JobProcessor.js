const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const logger = require('../config/logger');

class JobProcessor {
  static async processSaveConversation(job) {
    const { id, userId, title, description } = job.data;
    await pool.query(
      `INSERT INTO conversations (id, user_id, title, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [id, userId, title, description || null]
    );
    logger.info('Conversation saved via queue', { conversationId: id });
    return { conversationId: id };
  }

  static async processSaveMessage(job) {
    const { conversationId, role, content, metadata, reasoningSteps, toolCalls } = job.data;
    const id = uuidv4();
    const query = `INSERT INTO messages (id, conversation_id, role, content, metadata, reasoning_steps, tool_calls, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`;
    const params = [id, conversationId, role, content || '',
      JSON.stringify(metadata || {}), JSON.stringify(reasoningSteps || []), JSON.stringify(toolCalls || [])];

    const MAX_RETRIES = 5;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await pool.query(query, params);
        break;
      } catch (err) {
        if (err.code === '23503' && attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));
        } else {
          throw err;
        }
      }
    }
    logger.info('Message saved via queue', { conversationId, role, messageId: id });
    return { messageId: id, conversationId, role };
  }

  static async processSaveToolExecution(job) {
    const { conversationId, toolName, input, output, duration, status } = job.data;
    const id = uuidv4();
    await pool.query(
      `INSERT INTO tool_executions (id, conversation_id, tool_name, input, output, duration_ms, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [id, conversationId, toolName, JSON.stringify(input), JSON.stringify(output), duration || 0, status || 'completed']
    );
    return { executionId: id };
  }

  static async processSaveAgentExecution(job) {
    const { conversationId, agentName, input, output, duration, status, parentExecutionId } = job.data;
    const id = uuidv4();
    await pool.query(
      `INSERT INTO agent_executions (id, conversation_id, agent_name, input, output, duration_ms, status, parent_execution_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [id, conversationId, agentName, JSON.stringify(input), JSON.stringify(output), duration || 0, status || 'completed', parentExecutionId || null]
    );
    return { executionId: id };
  }

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
