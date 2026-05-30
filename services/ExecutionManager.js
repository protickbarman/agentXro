const { mongoose } = require('../config/mongodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

const executionStateSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  execution_id: { type: String, required: true, unique: true, index: true },
  agent_name: { type: String },
  status: { type: String },
  mode: { type: String },
  checkpoint: { type: mongoose.Schema.Types.Mixed, default: {} },
  timeline: { type: mongoose.Schema.Types.Mixed, default: {} },
  current_step: { type: Number, default: 0 },
  total_steps: { type: Number, default: 0 },
  completed_steps: { type: mongoose.Schema.Types.Mixed, default: [] },
  user_id: { type: String },
  conversation_id: { type: String },
  expires_at: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, { versionKey: false });

executionStateSchema.index({ status: 1, expires_at: 1 });
executionStateSchema.index({ user_id: 1 });

const ExecutionState = mongoose.models.ExecutionState
  || mongoose.model('ExecutionState', executionStateSchema, 'execution_states');

/**
 * ExecutionManager - Pause/Resume/Cancel agent execution lifecycle
 * Part of Pause/Resume Agent Execution skill
 */
class ExecutionManager {
  constructor() {
    this.activeExecutions = new Map();
    this.checkpointInterval = 10000;
    this.MAX_PAUSED_PER_USER = 10;
  }

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

  complete(id) {
    const execution = this.activeExecutions.get(id);
    if (!execution) return;

    execution.status = 'completed';
    execution.timeline.completedAt = new Date();
    this._emit(execution, 'execution:completed', { id });
    this.activeExecutions.delete(id);
  }

  fail(id, error) {
    const execution = this.activeExecutions.get(id);
    if (!execution) return;

    execution.status = 'failed';
    execution.error = error.message;
    this._emit(execution, 'execution:error', { id, error: error.message });
    this.activeExecutions.delete(id);
  }

  getStatus(id) {
    return this.activeExecutions.get(id) || null;
  }

  listActive() {
    return Array.from(this.activeExecutions.values())
      .filter(e => e.status === 'processing' || e.status === 'paused');
  }

  listPaused() {
    return Array.from(this.activeExecutions.values)
      .filter(e => e.status === 'paused');
  }

  async pauseByUser(userId) {
    const userExecutions = Array.from(this.activeExecutions.values())
      .filter(e => e.userId === userId && e.status === 'processing');

    for (const exec of userExecutions) {
      await this.pause(exec.id);
    }
  }

  async resumeByUser(userId) {
    const userExecutions = Array.from(this.activeExecutions.values())
      .filter(e => e.userId === userId && e.status === 'paused');

    for (const exec of userExecutions) {
      await this.resume(exec.id);
    }
  }

  async recoverPausedExecutions() {
    try {
      const states = await ExecutionState.find({
        status: 'paused',
        expires_at: { $gt: new Date() }
      }).lean();

      for (const state of states) {
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

      logger.info(`Recovered ${states.length} paused executions`);
    } catch (err) {
      logger.error(`Failed to recover paused executions: ${err.message}`);
    }
  }

  async cleanupExpired(options = {}) {
    const olderThan = options.olderThan || '24h';

    for (const [id, execution] of this.activeExecutions) {
      const elapsed = Date.now() - execution.timeline.startedAt;
      if (elapsed > parseDuration(olderThan) && execution.status === 'paused') {
        await this.cancel(id);
      }
    }

    const oneHourAgo = new Date(Date.now() - 3600000);
    await ExecutionState.deleteMany({
      status: 'paused',
      expires_at: { $lt: new Date() }
    });
  }

  _emit(execution, event, data) {
    const ws = execution.webSocket;
    if (ws) {
      ws.send(JSON.stringify({ type: event, ...data }));
    }
  }

  async _saveState(execution) {
    try {
      const promise = ExecutionState.findOneAndUpdate(
        { execution_id: execution.id },
        {
          $set: {
            agent_name: execution.agentName,
            status: execution.status,
            mode: execution.mode,
            checkpoint: execution.checkpoint,
            timeline: execution.timeline,
            current_step: execution.currentStep,
            total_steps: execution.totalSteps,
            completed_steps: execution.completedSteps,
            user_id: execution.userId,
            conversation_id: execution.conversationId,
            expires_at: new Date(Date.now() + 3600000),
            updated_at: new Date(),
          }
        },
        { upsert: true, new: true }
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