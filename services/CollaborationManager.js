const { mongoose } = require('../config/mongodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const TaskDelegator = require('./TaskDelegator');

const workflowSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  status: { type: String, default: 'pending' },
  steps: { type: mongoose.Schema.Types.Mixed, default: [] },
  conversation_id: { type: String },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  error_message: { type: String, default: null },
  current_step: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  completed_at: { type: Date, default: null },
}, { versionKey: false });

const Workflow = mongoose.models.Workflow
  || mongoose.model('Workflow', workflowSchema, 'collaboration_workflows');

class CollaborationManager {
  constructor() {
    this.activeWorkflows = new Map();
  }

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
      await Workflow.create({
        _id: id,
        name: workflowDef.name,
        status: 'pending',
        steps: workflowDef.steps,
        conversation_id: conversationId,
      });
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

      await Workflow.findByIdAndUpdate(workflowId, {
        $set: {
          status: 'completed',
          result: workflow.results,
          completed_at: new Date(),
        }
      });

      this._emit(workflowId, 'completed', {
        workflowId,
        results: workflow.results,
        totalTime: Date.now() - new Date(workflow.startedAt).getTime(),
      });
    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;

      await Workflow.findByIdAndUpdate(workflowId, {
        $set: {
          status: 'failed',
          error_message: error.message,
          completed_at: new Date(),
        }
      });

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

        await Workflow.findByIdAndUpdate(workflow.id, {
          $set: { current_step: i, updated_at: new Date() }
        });
      } catch (error) {
        workflow.errors.push({ step: i, agent: step.agent, error: error.message });

        this._emit(workflow.id, 'step:failed', {
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
      try { handler(data); } catch (e) {}
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

  async getStatus(id) {
    try {
      const doc = await Workflow.findById(id).lean();
      return doc ? { ...doc, id: doc._id } : null;
    } catch (err) {
      logger.warn(`Failed to get workflow status: ${err.message}`);
      return null;
    }
  }

  async cancel(id) {
    const workflow = this.activeWorkflows.get(id);
    if (!workflow) return false;

    workflow.status = 'cancelled';
    this.activeWorkflows.delete(id);

    await Workflow.findByIdAndUpdate(id, {
      $set: { status: 'cancelled', completed_at: new Date() }
    });

    return true;
  }
}

module.exports = new CollaborationManager();