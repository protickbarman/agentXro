const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const AgentMessenger = require('./AgentMessenger');
const TaskDelegator = require('./TaskDelegator');

/**
 * CollaborationManager - Multi-agent workflow orchestration
 * Part of Agent-to-Agent Communication skill
 */
class CollaborationManager {
  constructor() {
    this.activeWorkflows = new Map();
  }

  /**
   * Start a multi-agent collaboration workflow
   * @param {object} workflow - Workflow definition
   * @returns {Promise<object>}
   */
  async startWorkflow(workflow) {
    const { name, agents, task, conversationId, goal, mode } = workflow;
    const id = uuidv4();

    const steps = task?.steps || (agents || []).map(a => ({
      agent: a,
      task: goal || task || 'unknown',
    }));

    const workflowDef = {
      id,
      name: name || `workflow-${Date.now()}`,
      agents: agents || [],
      task,
      goal: goal || task,
      mode: mode || 'parallel',
      status: 'pending',
      currentStep: 0,
      steps,
      results: [],
      errors: [],
      conversationId,
      startedAt: new Date().toISOString(),
      listeners: new Map(),
    };

    this.activeWorkflows.set(id, workflowDef);

    try {
      await query(
        `INSERT INTO collaboration_workflows (id, name, status, steps, conversation_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, workflowDef.name, 'pending', JSON.stringify(workflowDef.steps), conversationId]
      );
    } catch (err) {
      logger.warn(`Failed to persist workflow (non-blocking): ${err.message}`);
    }

    this._executeWorkflow(id).catch(err => {
      logger.error(`Workflow ${id} failed: ${err.message}`);
    });

    return {
      id,
      name: workflowDef.name,
      status: 'pending',
      totalSteps: workflowDef.steps.length,
      on: (event, handler) => {
        if (!workflowDef.listeners.has(event)) workflowDef.listeners.set(event, []);
        workflowDef.listeners.get(event).push(handler);
      },
      waitForCompletion: () => this._waitForCompletion(id),
    };
  }

  async _executeWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

    workflow.status = 'running';
    this._emit(workflowId, 'started', { workflowId, name: workflow.name });

    const aggregation = workflow.steps.length > 0
      ? (workflow.task?.aggregation || workflow.mode || 'sequential')
      : 'parallel';

    try {
      if (aggregation === 'sequential') {
        await this._executeSequential(workflow);
      } else if (aggregation === 'parallel') {
        await this._executeParallel(workflow);
      } else {
        await this._executeCustom(workflow);
      }

      workflow.status = 'completed';
      workflow.completedAt = new Date().toISOString();

      await query(
        `UPDATE collaboration_workflows SET status = 'completed', result = $1, completed_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(workflow.results), workflowId]
      );

      this._emit(workflowId, 'completed', {
        workflowId,
        results: workflow.results,
        totalTime: Date.now() - new Date(workflow.startedAt).getTime(),
      });
    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;

      await query(
        `UPDATE collaboration_workflows SET status = 'failed', error_message = $1, completed_at = NOW()
         WHERE id = $2`,
        [error.message, workflowId]
      );

      this._emit(workflowId, 'failed', { workflowId, error: error.message });
    }
  }

  async _executeSequential(workflow) {
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      workflow.currentStep = i;

      this._emit(workflow.id, 'step:started', {
        step: i, agent: step.agent, task: step.task,
      });

      try {
        const result = await TaskDelegator.delegate('main-agent', {
          task: step.task,
          assignee: step.agent,
          context: { ...workflow.task, conversationId: workflow.conversationId },
          priority: 'high',
        });

        workflow.results.push({ step: i, agent: step.agent, result });

        this._emit(workflow.id, 'step:completed', {
          step: i, agent: step.agent, result,
        });

        await query(
          `UPDATE collaboration_workflows SET current_step = $1 WHERE id = $2`,
          [i, workflow.id]
        );
      } catch (error) {
        workflow.errors.push({ step: i, agent: step.agent, error: error.message });

        this._emit(workflowId, 'step:failed', {
          step: i, agent: step.agent, error: error.message,
        });

        throw error;
      }
    }
  }

  async _executeParallel(workflow) {
    const promises = workflow.steps.map(async (step, i) => {
      try {
        const result = await TaskDelegator.delegate('main-agent', {
          task: step.task,
          assignee: step.agent,
          context: { ...workflow.task, conversationId: workflow.conversationId },
        });
        return { step: i, agent: step.agent, result };
      } catch (error) {
        return { step: i, agent: step.agent, error: error.message };
      }
    });

    const results = await Promise.all(promises);

    for (const r of results) {
      if (r.error) {
        workflow.errors.push(r);
      } else {
        workflow.results.push(r);
      }
    }
  }

  async _executeCustom(workflow) {
    const customHandler = workflow.task.customHandler;
    if (typeof customHandler === 'function') {
      const result = await customHandler(workflow);
      workflow.results.push(result);
    } else {
      await this._executeSequential(workflow);
    }
  }

  _emit(workflowId, event, data) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    const handlers = workflow.listeners.get(event) || [];
    for (const handler of handlers) {
      try { handler(data); } catch (e) { /* ignore listener errors */ }
    }
  }

  _waitForCompletion(workflowId) {
    return new Promise((resolve, reject) => {
      const workflow = this.activeWorkflows.get(workflowId);
      if (!workflow) return reject(new Error('Workflow not found'));
      if (workflow.status === 'completed') return resolve(workflow.results);
      if (workflow.status === 'failed') return reject(new Error(workflow.error));

      workflow.listeners.set('completed', [(data) => resolve(data.results)]);
      workflow.listeners.set('failed', [(data) => reject(new Error(data.error))]);
    });
  }

  /**
   * Get workflow status
   * @param {string} id - Workflow ID
   * @returns {Promise<object>}
   */
  async getStatus(id) {
    try {
      const result = await query(
        `SELECT * FROM collaboration_workflows WHERE id = $1`, [id]
      );
      return result.rows[0] || null;
    } catch (err) {
      logger.warn(`Failed to get workflow status: ${err.message}`);
      return null;
    }
  }

  /**
   * Cancel a workflow
   * @param {string} id - Workflow ID
   * @returns {Promise<boolean>}
   */
  async cancel(id) {
    const workflow = this.activeWorkflows.get(id);
    if (!workflow) return false;

    workflow.status = 'cancelled';
    this.activeWorkflows.delete(id);

    await query(
      `UPDATE collaboration_workflows SET status = 'cancelled', completed_at = NOW() WHERE id = $1`,
      [id]
    );

    return true;
  }
}

module.exports = new CollaborationManager();
