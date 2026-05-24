const { query, getOne, getMany } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ToolExecution {
  static async create(messageId, toolName, input, status = 'pending', toolType = null) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO tool_executions (id, message_id, tool_name, tool_type, input, status, retry_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, NOW())
       RETURNING id, tool_name, status, created_at`,
      [id, messageId, toolName, toolType, JSON.stringify(input), status]
    );
    return result.rows[0];
  }

  static async update(id, { output, status, executionTime, errorMessage, retryCount }) {
    const updates = [];
    const params = [];
    let paramNum = 1;

    if (output !== undefined) {
      updates.push(`output = $${paramNum++}`);
      params.push(JSON.stringify(output));
    }
    if (status !== undefined) {
      updates.push(`status = $${paramNum++}`);
      params.push(status);
    }
    if (executionTime !== undefined) {
      updates.push(`execution_time_ms = $${paramNum++}`);
      params.push(executionTime);
    }
    if (errorMessage !== undefined) {
      updates.push(`error_message = $${paramNum++}`);
      params.push(errorMessage);
    }
    if (retryCount !== undefined) {
      updates.push(`retry_count = $${paramNum++}`);
      params.push(retryCount);
    }

    if (updates.length > 0) {
      updates.push(`completed_at = NOW()`);
      params.push(id);

      const updateQuery = `UPDATE tool_executions SET ${updates.join(', ')} WHERE id = $${paramNum} RETURNING *`;
      return await query(updateQuery, params);
    }
  }

  static async findById(id) {
    return getOne(
      `SELECT id, message_id, tool_name, tool_type, input, output, status, error_message, retry_count, execution_time_ms, created_at, completed_at
       FROM tool_executions WHERE id = $1`,
      [id]
    );
  }

  static async findByMessageId(messageId) {
    return getMany(
      `SELECT id, tool_name, tool_type, input, output, status, error_message, execution_time_ms, created_at
       FROM tool_executions WHERE message_id = $1
       ORDER BY created_at DESC`,
      [messageId]
    );
  }
}

module.exports = ToolExecution;
