const { mongoose } = require('../config/mongodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const agentRegistry = require('../agents/AgentRegistry');
const AgentMessenger = require('./AgentMessenger');

const taskDelegationSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  from_agent: { type: String },
  to_agent: { type: String, required: true },
  task_description: { type: String },
  context: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, default: 'pending' },
  priority: { type: String, default: 'medium' },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  error_message: { type: String, default: null },
  retry_count: { type: Number, default: 0 },
  conversation_id: { type: String },
  created_at: { type: Date, default: Date.now },
  completed_at: { type: Date, default: null },
}, { versionKey: false });

const TaskDelegation = mongoose.models.TaskDelegation
  || mongoose.model('TaskDelegation', taskDelegationSchema, 'task_delegations');

class TaskDelegator {
  constructor() {
    this.activeDelegations = new Map();
    this.MAX_RETRIES = 3;
  }

  async delegate(fromAgent, task) {
    if (typeof fromAgent === 'object') {
      task = fromAgent;
      fromAgent = task.from;
    }
    const {
      task: taskDescription, assignee, to, context, from: fromAlt,
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
      conversationId: context?.conversationId,
      createdAt: new Date().toISOString(),
    };

    this.activeDelegations.set(delegationId, delegation);

    try {
      await TaskDelegation.create({
        _id: delegationId,
        from_agent: delegator,
        to_agent: targetAgent,
        task_description: taskDescription,
        context: context || {},
        status: 'pending',
        priority,
        conversation_id: context?.conversationId,
      });
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

        await TaskDelegation.findByIdAndUpdate(id, {
          $set: {
            status: 'completed',
            result: result,
            completed_at: new Date(),
          }
        });

        logger.info(`Delegation completed: ${id}`);
        return result;
      } catch (error) {
        lastError = error;
        logger.warn(`Delegation attempt ${attempt + 1}/${maxRetries + 1} failed: ${error.message}`);

        if (attempt < maxRetries) {
          try {
            await TaskDelegation.findByIdAndUpdate(id, {
              $set: { retry_count: attempt + 1 }
            });
          } catch (dbErr) {
            logger.warn(`Failed to update retry count (non-blocking): ${dbErr.message}`);
          }
        }
      }
    }

    this._updateStatus(id, 'failed', null, lastError.message);

    try {
      await TaskDelegation.findByIdAndUpdate(id, {
        $set: {
          status: 'failed',
          error_message: lastError.message,
          completed_at: new Date(),
        }
      });
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

  getStatus(id) {
    return this.activeDelegations.get(id) || null;
  }

  async cancel(id) {
    const delegation = this.activeDelegations.get(id);
    if (!delegation) return false;

    this._updateStatus(id, 'cancelled');
    this.activeDelegations.delete(id);

    await TaskDelegation.findByIdAndUpdate(id, {
      $set: { status: 'cancelled', completed_at: new Date() }
    });

    return true;
  }

  async listForAgent(agentName, status = null) {
    const filter = {
      $or: [{ from_agent: agentName }, { to_agent: agentName }]
    };
    if (status) filter.status = status;

    const docs = await TaskDelegation
      .find(filter)
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    return docs.map(d => ({ ...d, id: d._id }));
  }
}

module.exports = new TaskDelegator();