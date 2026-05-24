const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * ExecutionManager - Pause/Resume/Cancel agent execution lifecycle
 * Part of Pause/Resume Agent Execution skill
 */
class ExecutionManager {
  constructor() {
    this.activeExecutions = new Map();
    this.checkpointInterval = 10000; // Checkpoint every 10s
    this.MAX_PAUSED_PER_USER = 10;
  }

  /**
   * Start tracking an execution
   * @param {object} execution - Execution info
   * @returns {object}
   */
  start(execution) {
    const { executionId, agentName, conversationId, userId, mode = 'automatic' } = execution;
    const id = executionId || uuidv4();

    const state = {
      id,
      agentName,
      conversationId,
      userId,
      mode,
      status: 'processing',
      currentStep: 0,
      totalSteps: execution.totalSteps || 0,
      completedSteps: [],
      checkpoint: {
        currentContext: { query: execution.query || '', instructions: '' },
        llmState: { tokensUsed: 0 },
        resourcesAllocated: [],
      },
      timeline: {
        startedAt: new Date(),
        lastPausedAt: null,
        totalActiveTime: 0,
        pauseCount: 0,
      },
      resources: [],
    };

    this.activeExecutions.set(id, state);
    return state;
  }

  /**
   * Pause a running execution
   * @param {string} id - Execution ID
   * @returns {Promise<object>}
   */
  async pause(id) {
    const execution = this.activeExecutions.get(id);
    if (!execution) throw new Error(`Execution not found: ${id}`);
    if (execution.status !== 'processing') throw new Error(`Cannot pause execution in state: ${execution.status}`);

    execution.status = 'paused';
    execution.timeline.lastPausedAt = new Date();
    execution.timeline.pauseCount++;

    this._saveState(execution).catch(() => {});
    this._emit(execution, 'execution:paused', { id, step: execution.currentStep });

    return execution;
  }

  /**
   * Resume a paused execution
   * @param {string} id - Execution ID
   * @param {object} modifications - Optional modifications
   * @returns {Promise<object>}
   */
  async resume(id, modifications = {}) {
    const execution = this.activeExecutions.get(id);
    if (!execution) throw new Error(`Execution not found: ${id}`);
    if (execution.status !== 'paused') throw new Error(`Cannot resume execution in state: ${execution.status}`);

    if (modifications.modifiedQuery) {
      execution.checkpoint.currentContext.query = modifications.modifiedQuery;
    }
    if (modifications.additionalContext) {
      Object.assign(execution.checkpoint.currentContext, modifications.additionalContext);
    }
    if (modifications.skipSteps) {
      execution.currentStep = Math.max(...modifications.skipSteps.map(s => s + 1));
    }

    execution.status = 'processing';
    execution.timeline.totalActiveTime += Date.now() - execution.timeline.lastPausedAt;

    this._emit(execution, 'execution:resumed', { id, step: execution.currentStep });
    return execution;
  }

  /**
   * Cancel an execution
   * @param {string} id - Execution ID
   * @param {object} options - Cancel options
   * @returns {Promise<object>}
   */
  async cancel(id, options = {}) {
    const execution = this.activeExecutions.get(id);
    if (!execution) throw new Error(`Execution not found: ${id}`);

    execution.status = 'cancelled';
    execution.timeline.completedAt = new Date();

    if (options.cleanupResources) {
      await this._releaseResources(execution);
    }

    await this._saveState(execution);
    this.activeExecutions.delete(id);

    this._emit(execution, 'execution:cancelled', { id });
    return execution;
  }

  /**
   * Advance to next step (for step-through mode)
   * @param {string} id - Execution ID
   * @returns {Promise<object>}
   */
  async nextStep(id) {
    const execution = this.activeExecutions.get(id);
    if (!execution) throw new Error(`Execution not found: ${id}`);
    if (execution.mode !== 'step-through') throw new Error('Execution is not in step-through mode');

    execution.currentStep++;
    this._emit(execution, 'execution:step:ready', {
      id, step: execution.currentStep, totalSteps: execution.totalSteps,
    });

    return execution;
  }

  /**
   * Mark a step as completed
   * @param {string} id - Execution ID
   * @param {number} step - Step number
   * @param {object} result - Step result
   * @returns {Promise<void>}
   */
  async completeStep(id, step, result) {
    const execution = this.activeExecutions.get(id);
    if (!execution) return;

    execution.completedSteps.push({ step, result, completedAt: new Date() });

    if (step >= execution.totalSteps) {
      execution.status = 'completed';
      execution.timeline.completedAt = new Date();
      this._emit(execution, 'execution:completed', { id, results: execution.completedSteps });
      this.activeExecutions.delete(id);
    } else if (execution.mode === 'step-through') {
      this._emit(execution, 'execution:step:ready', {
        id, step: step + 1, totalSteps: execution.totalSteps,
      });
    }
  }

  /**
   * Modify execution while paused
   * @param {string} id - Execution ID
   * @param {object} modifications - Modifications
   * @returns {Promise<object>}
   */
  async modify(id, modifications) {
    const execution = this.activeExecutions.get(id);
    if (!execution) throw new Error(`Execution not found: ${id}`);
    if (execution.status !== 'paused') throw new Error('Can only modify paused executions');

    if (modifications.modifiedQuery) {
      execution.checkpoint.currentContext.query = modifications.modifiedQuery;
    }
    if (modifications.additionalInstructions) {
      execution.checkpoint.currentContext.instructions = modifications.additionalInstructions;
    }
    if (modifications.injectData) {
      Object.assign(execution.checkpoint.currentContext, modifications.injectData);
    }
    if (modifications.skipSteps) {
      execution.currentStep = Math.max(...modifications.skipSteps) + 1;
    }

    return execution;
  }

  /**
   * Mark execution as completed
   * @param {string} id - Execution ID
   */
  complete(id) {
    const execution = this.activeExecutions.get(id);
    if (!execution) return;

    execution.status = 'completed';
    execution.timeline.completedAt = new Date();
    this._emit(execution, 'execution:completed', { id });
    this.activeExecutions.delete(id);
  }

  /**
   * Mark execution as failed
   * @param {string} id - Execution ID
   * @param {Error} error - Error
   */
  fail(id, error) {
    const execution = this.activeExecutions.get(id);
    if (!execution) return;

    execution.status = 'failed';
    execution.error = error.message;
    this._emit(execution, 'execution:error', { id, error: error.message });
    this.activeExecutions.delete(id);
  }

  /**
   * Get execution status
   * @param {string} id - Execution ID
   * @returns {object|null}
   */
  getStatus(id) {
    return this.activeExecutions.get(id) || null;
  }

  /**
   * List all active executions
   * @returns {Array}
   */
  listActive() {
    return Array.from(this.activeExecutions.values())
      .filter(e => e.status === 'processing' || e.status === 'paused');
  }

  /**
   * List paused executions
   * @returns {Array}
   */
  listPaused() {
    return Array.from(this.activeExecutions.values())
      .filter(e => e.status === 'paused');
  }

  /**
   * Pause all executions for a user
   * @param {string} userId - User ID
   */
  async pauseByUser(userId) {
    const userExecutions = Array.from(this.activeExecutions.values())
      .filter(e => e.userId === userId && e.status === 'processing');

    for (const exec of userExecutions) {
      await this.pause(exec.id);
    }
  }

  /**
   * Resume all paused executions for a user
   * @param {string} userId - User ID
   */
  async resumeByUser(userId) {
    const userExecutions = Array.from(this.activeExecutions.values())
      .filter(e => e.userId === userId && e.status === 'paused');

    for (const exec of userExecutions) {
      await this.resume(exec.id);
    }
  }

  /**
   * Recover paused executions after restart
   */
  async recoverPausedExecutions() {
    try {
      const result = await query(
        `SELECT * FROM execution_states WHERE status = 'paused' AND expires_at > NOW()`
      );

      for (const state of result.rows) {
        this.activeExecutions.set(state.execution_id, {
          id: state.execution_id,
          agentName: state.agent_name,
          conversationId: state.conversation_id,
          userId: state.user_id,
          mode: state.mode,
          status: 'paused',
          currentStep: state.current_step,
          totalSteps: state.total_steps,
          completedSteps: state.completed_steps || [],
          checkpoint: state.checkpoint,
          timeline: state.timeline || {},
        });
      }

      logger.info(`Recovered ${result.rows.length} paused executions`);
    } catch (err) {
      logger.error(`Failed to recover paused executions: ${err.message}`);
    }
  }

  /**
   * Cleanup expired executions
   * @param {object} options - Cleanup options
   */
  async cleanupExpired(options = {}) {
    const olderThan = options.olderThan || '24h';

    for (const [id, execution] of this.activeExecutions) {
      const elapsed = Date.now() - execution.timeline.startedAt;
      if (elapsed > parseDuration(olderThan) && execution.status === 'paused') {
        await this.cancel(id);
      }
    }

    await query(
      `DELETE FROM execution_states WHERE status = 'paused' AND expires_at < NOW()`
    );
  }

  _emit(execution, event, data) {
    const ws = execution.webSocket;
    if (ws) {
      ws.send(JSON.stringify({ type: event, ...data }));
    }
  }

  async _saveState(execution) {
    try {
      const { query } = require('../config/database');
      const promise = query(
        `INSERT INTO execution_states (execution_id, agent_name, status, mode, checkpoint, timeline,
          current_step, total_steps, completed_steps, user_id, conversation_id, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() + INTERVAL '1 hour')
         ON CONFLICT (execution_id) DO UPDATE
         SET status = $3, checkpoint = $5, timeline = $6, current_step = $7, updated_at = NOW()`,
        [execution.id, execution.agentName, execution.status, execution.mode,
         JSON.stringify(execution.checkpoint), JSON.stringify(execution.timeline),
         execution.currentStep, execution.totalSteps,
         JSON.stringify(execution.completedSteps), execution.userId, execution.conversationId]
      );
      await Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 2000))
      ]);
    } catch (err) {
      logger.warn(`Failed to save execution state (non-blocking): ${err.message}`);
    }
  }

  async _releaseResources(execution) {
    for (const resource of execution.resources || []) {
      try {
        if (resource.type === 'tool' && resource.release) {
          await resource.release();
        }
      } catch (err) {
        logger.warn(`Failed to release resource: ${resource.name}`);
      }
    }
    execution.resources = [];
  }
}

function parseDuration(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 86400000;
  const num = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * (multipliers[unit] || 3600000);
}

module.exports = new ExecutionManager();
