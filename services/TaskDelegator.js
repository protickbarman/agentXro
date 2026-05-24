const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const agentRegistry = require('../agents/AgentRegistry');
const AgentMessenger = require('./AgentMessenger');

/**
 * TaskDelegator - Agent task delegation system
 * Part of Agent-to-Agent Communication skill
 */
class TaskDelegator {
  constructor() {
    this.activeDelegations = new Map();
    this.MAX_RETRIES = 3;
  }

  /**
   * Delegate a task to another agent
   * @param {string|object} fromAgent - Delegating agent (or single config object)
   * @param {object} [task] - Task definition
   * @returns {Promise<object>}
   */
  async delegate(fromAgent, task) {
    if (typeof fromAgent === 'object') {
      task = fromAgent;
      fromAgent = task.from;
    }
    const {
      task: taskDescription, assignee, to, context, from: fromAlt,
      deadline = null, requiredCapabilities = [],
      priority = 'medium', maxRetries = this.MAX_RETRIES,
    } = task || {};

    const delegator = fromAgent || fromAlt;
    const targetAgent = assignee || to;
    if (!targetAgent) throw new Error('Assignee (target agent) is required');
    if (targetAgent && !agentRegistry.has(targetAgent) && !delegator) throw new Error(`Agent not found: ${targetAgent}`);

    const delegationId = uuidv4();
    const delegation = {
      id: delegationId,
      fromAgent: delegator,
      toAgent: targetAgent,
      task: taskDescription,
      context: context || {},
      status: 'pending',
      priority,
      retryCount: 0,
      maxRetries,
      deadline,
      createdAt: new Date().toISOString(),
    };

    this.activeDelegations.set(delegationId, delegation);

    try {
      await query(
        `INSERT INTO task_delegations (id, from_agent, to_agent, task_description, context, status, priority, conversation_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [delegationId, delegator, targetAgent, taskDescription, JSON.stringify(context),
         'pending', priority, context?.conversationId]
      );
    } catch (err) {
      logger.warn(`Failed to persist delegation (non-blocking): ${err.message}`);
    }

    logger.info(`Task delegated: ${delegator} → ${targetAgent} (${delegationId})`);

    this._processDelegation(delegation).catch(err => {
      logger.error(`Delegation failed: ${delegationId} - ${err.message}`);
    });

    return {
      id: delegationId,
      status: 'pending',
      fromAgent: delegator,
      toAgent: targetAgent,
      task: taskDescription,
    };
  }

  async _processDelegation(delegation) {
    const { id, fromAgent, toAgent, task, context, maxRetries } = delegation;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this._updateStatus(id, 'processing');

        const response = await AgentMessenger.send(fromAgent, toAgent, {
          intent: 'task_execution',
          payload: { task, context, delegationId: id, attempt },
          format: 'json',
          metadata: { priority: delegation.priority, isDelegation: true },
          conversationId: context?.conversationId,
        });

        const result = response?.response || response;

        this._updateStatus(id, 'completed', result);

        await query(
          `UPDATE task_delegations SET status = 'completed', result = $1, completed_at = NOW()
           WHERE id = $2`,
          [JSON.stringify(result), id]
        );

        logger.info(`Delegation completed: ${id}`);
        return result;
      } catch (error) {
        lastError = error;
        logger.warn(`Delegation attempt ${attempt + 1}/${maxRetries + 1} failed: ${error.message}`);

        if (attempt < maxRetries) {
          try {
            await query(
              `UPDATE task_delegations SET retry_count = $1 WHERE id = $2`,
              [attempt + 1, id]
            );
          } catch (dbErr) {
            logger.warn(`Failed to update retry count (non-blocking): ${dbErr.message}`);
          }
        }
      }
    }

    this._updateStatus(id, 'failed', null, lastError.message);

    try {
      await query(
        `UPDATE task_delegations SET status = 'failed', error_message = $1, completed_at = NOW()
         WHERE id = $2`,
        [lastError.message, id]
      );
    } catch (dbErr) {
      logger.warn(`Failed to persist failure (non-blocking): ${dbErr.message}`);
    }

    throw new Error(`Delegation failed after ${maxRetries + 1} attempts: ${lastError.message}`);
  }

  _updateStatus(id, status, result = null, error = null) {
    const delegation = this.activeDelegations.get(id);
    if (delegation) {
      delegation.status = status;
      if (result) delegation.result = result;
      if (error) delegation.error = error;
    }
  }

  /**
   * Get delegation status
   * @param {string} id - Delegation ID
   * @returns {object|null}
   */
  getStatus(id) {
    return this.activeDelegations.get(id) || null;
  }

  /**
   * Cancel a delegation
   * @param {string} id - Delegation ID
   * @returns {Promise<boolean>}
   */
  async cancel(id) {
    const delegation = this.activeDelegations.get(id);
    if (!delegation) return false;

    this._updateStatus(id, 'cancelled');
    this.activeDelegations.delete(id);

    await query(
      `UPDATE task_delegations SET status = 'cancelled', completed_at = NOW() WHERE id = $1`,
      [id]
    );

    return true;
  }

  /**
   * List delegations for an agent
   * @param {string} agentName - Agent name
   * @param {string} status - Filter by status
   * @returns {Promise<Array>}
   */
  async listForAgent(agentName, status = null) {
    let sql = 'SELECT * FROM task_delegations WHERE (from_agent = $1 OR to_agent = $1)';
    const params = [agentName];
    let idx = 2;

    if (status) {
      sql += ` AND status = $${idx}`;
      params.push(status);
      idx++;
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';
    const result = await query(sql, params);
    return result.rows;
  }
}

module.exports = new TaskDelegator();
