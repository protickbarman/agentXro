const { query, getOne, getMany } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Message {
  static async create(conversationId, role, content, metadata = {}, reasoningSteps = [], toolCalls = []) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO messages (id, conversation_id, role, content, metadata, reasoning_steps, tool_calls, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, role, content, created_at`,
      [id, conversationId, role, content, JSON.stringify(metadata), JSON.stringify(reasoningSteps), JSON.stringify(toolCalls)]
    );
    return result.rows[0];
  }

  static async findById(id) {
    return getOne(
      `SELECT id, conversation_id, role, content, metadata, reasoning_steps, tool_calls, created_at, updated_at
       FROM messages WHERE id = $1`,
      [id]
    );
  }

  static async findByConversationIdPaginated(conversationId, limit = 50, offset = 0) {
    return getMany(
      `SELECT id, role, content, metadata, reasoning_steps, tool_calls, created_at
       FROM messages WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );
  }

  static async getConversationHistory(conversationId, limit = 50) {
    return getMany(
      `SELECT id, role, content, created_at
       FROM messages WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [conversationId, limit]
    );
  }

  static async delete(id) {
    await query('DELETE FROM messages WHERE id = $1', [id]);
  }
}

module.exports = Message;
