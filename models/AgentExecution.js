const { query, getOne, getMany } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class AgentExecution {
  static async create(messageId, agentName, inputQuery, agentType = 'main') {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO agent_executions (id, message_id, agent_name, agent_type, input_query, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'processing', NOW())
       RETURNING id, agent_name, status, created_at`,
      [id, messageId, agentName, agentType, inputQuery]
    );
    return result.rows[0];
  }

  static async update(id, {
    outputResponse,
    status,
    complexityLevel,
    decisionReason,
    assistantsInvolved,
    executionTime,
    tokensUsed,
    llmProvider,
    errorMessage,
  }) {
    const updates = [];
    const params = [];
    let paramNum = 1;

    if (outputResponse !== undefined) {
      updates.push(`output_response = $${paramNum++}`);
      params.push(outputResponse);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramNum++}`);
      params.push(status);
    }
    if (complexityLevel !== undefined) {
      updates.push(`complexity_level = $${paramNum++}`);
      params.push(complexityLevel);
    }
    if (decisionReason !== undefined) {
      updates.push(`decision_reason = $${paramNum++}`);
      params.push(decisionReason);
    }
    if (assistantsInvolved !== undefined) {
      updates.push(`sub_agents_involved = $${paramNum++}`);
      params.push(JSON.stringify(assistantsInvolved));
    }
    if (executionTime !== undefined) {
      updates.push(`execution_time_ms = $${paramNum++}`);
      params.push(executionTime);
    }
    if (tokensUsed !== undefined) {
      updates.push(`tokens_used = $${paramNum++}`);
      params.push(tokensUsed);
    }
    if (llmProvider !== undefined) {
      updates.push(`llm_provider = $${paramNum++}`);
      params.push(llmProvider);
    }
    if (errorMessage !== undefined) {
      updates.push(`error_message = $${paramNum++}`);
      params.push(errorMessage);
    }

    if (updates.length > 0) {
      updates.push(`completed_at = NOW()`);
      params.push(id);

      const updateQuery = `UPDATE agent_executions SET ${updates.join(', ')} WHERE id = $${paramNum} RETURNING *`;
      return await query(updateQuery, params);
    }
  }

  static async findById(id) {
    return getOne(
      `SELECT id, message_id, agent_name, agent_type, input_query, output_response, status, complexity_level, decision_reason, sub_agents_involved, execution_time_ms, tokens_used, llm_provider, error_message, created_at, completed_at
       FROM agent_executions WHERE id = $1`,
      [id]
    );
  }

  static async findByMessageId(messageId) {
    return getMany(
      `SELECT id, agent_name, agent_type, status, complexity_level, execution_time_ms, tokens_used, created_at
       FROM agent_executions WHERE message_id = $1
       ORDER BY created_at DESC`,
      [messageId]
    );
  }
}

module.exports = AgentExecution;
