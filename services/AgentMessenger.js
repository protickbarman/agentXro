const { mongoose } = require('../config/mongodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const agentRegistry = require('../agents/AgentRegistry');

const agentMessageSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  message_type: { type: String, required: true },
  from_agent: { type: String, required: true },
  to_agent: { type: mongoose.Schema.Types.Mixed, required: true },
  intent: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  correlation_id: { type: String },
  conversation_id: { type: String },
  requires_response: { type: Boolean, default: true },
  status: { type: String, default: 'pending' },
  responded_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

agentMessageSchema.index({ from_agent: 1 });
agentMessageSchema.index({ to_agent: 1 });
agentMessageSchema.index({ conversation_id: 1 });

const AgentMessage = mongoose.models.AgentMessage
  || mongoose.model('AgentMessage', agentMessageSchema, 'agent_messages');

class AgentMessenger {
  constructor() {
    this.handlers = new Map();
    this.pendingResponses = new Map();
    this.DEFAULT_TIMEOUT = 30000;
  }

  async send(from, to, message) {
    if (typeof from === 'object') {
      const opts = from;
      from = opts.from;
      to = opts.to;
      message = { intent: opts.type || 'text', payload: opts.content, ...opts };
    }
    const {
      intent, payload, format = 'json',
      metadata = {}, conversationId
    } = message || {};

    const messageId = uuidv4();
    const correlationId = message.metadata?.correlationId || uuidv4();
    const targets = Array.isArray(to) ? to : [to];

    const msg = {
      id: messageId,
      type: 'request',
      from,
      to: targets,
      conversation: { id: conversationId },
      content: { intent, payload, format },
      metadata: { ...metadata, correlationId, requiresResponse: true },
      timestamp: new Date().toISOString(),
    };

    await this._logMessage(msg);

    const responses = [];
    for (const targetName of targets) {
      try {
        const agent = agentRegistry.get(targetName);
        if (!agent) {
          logger.warn(`Agent not found: ${targetName}`);
          responses.push({ agent: targetName, error: 'Agent not found' });
          continue;
        }

        const response = await agent.receiveMessage(
          { name: from, sendMessage: this.send.bind(this) },
          msg
        );

        responses.push({ agent: targetName, response });
      } catch (error) {
        logger.error(`Communication error ${from}→${targetName}: ${error.message}`);
        responses.push({ agent: targetName, error: error.message });
      }
    }

    await this._logResponse(messageId, responses);
    return responses.length === 1 ? responses[0] : responses;
  }

  async sendAndWait(from, to, message, timeout = this.DEFAULT_TIMEOUT) {
    const correlationId = uuidv4();
    const wrappedMessage = {
      ...message,
      metadata: { ...message.metadata, correlationId, requiresResponse: true },
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingResponses.delete(correlationId);
        reject(new Error(`Agent ${to} did not respond within ${timeout}ms`));
      }, timeout);

      this.pendingResponses.set(correlationId, { resolve, reject, timer });

      this.send(from, to, wrappedMessage).catch(err => {
        clearTimeout(timer);
        this.pendingResponses.delete(correlationId);
        reject(err);
      });
    });
  }

  async broadcastByType(from, agentType, message) {
    const targets = [];
    for (const [, agent] of agentRegistry.getAll()) {
      if (agent.type === agentType) {
        targets.push(agent.name || agent.id);
      }
    }
    return this.send(from, targets, message);
  }

  async broadcastAll(from, message) {
    const targets = Array.from(agentRegistry.getNames()).filter(n => n !== from);
    return this.send(from, targets, { ...message, metadata: { ...message.metadata, broadcast: true } });
  }

  async reply(originalMessage, response) {
    const correlationId = originalMessage.metadata?.correlationId;

    if (correlationId && this.pendingResponses.has(correlationId)) {
      const pending = this.pendingResponses.get(correlationId);
      clearTimeout(pending.timer);
      this.pendingResponses.delete(correlationId);
      pending.resolve(response);
    }

    const fromAgent = originalMessage.to?.[0] || 'unknown';
    const toAgent = originalMessage.from;

    const replyMsg = {
      id: uuidv4(),
      type: 'response',
      from: fromAgent,
      to: [toAgent],
      conversation: originalMessage.conversation,
      content: { intent: originalMessage.content?.intent, payload: response, format: 'json' },
      metadata: { correlationId, inReplyTo: originalMessage.id },
      timestamp: new Date().toISOString(),
    };

    const agent = agentRegistry.get(toAgent);
    if (agent) {
      await agent.receiveMessage({ name: fromAgent }, replyMsg);
    }

    return replyMsg;
  }

  isAvailable(agentName) {
    return agentRegistry.has(agentName);
  }

  registerHandler(agentName, intent, handler) {
    const key = `${agentName}:${intent}`;
    this.handlers.set(key, handler);
    logger.info(`Message handler registered: ${key}`);
  }

  async _logMessage(message) {
    try {
      await AgentMessage.create({
        _id: message.id,
        message_type: message.type,
        from_agent: message.from,
        to_agent: message.to,
        intent: message.content.intent,
        payload: message.content.payload || {},
        correlation_id: message.metadata.correlationId,
        conversation_id: message.conversation?.id,
        requires_response: message.metadata.requiresResponse !== false,
      });
    } catch (err) {
      logger.error(`Failed to log agent message: ${err.message}`);
    }
  }

  async _logResponse(messageId, responses) {
    try {
      const status = responses.some(r => r.error) ? 'partial' : 'success';
      await AgentMessage.findByIdAndUpdate(messageId, {
        $set: { status, responded_at: new Date() }
      });
    } catch (err) {
      logger.error(`Failed to log message response: ${err.message}`);
    }
  }

  async getHistory(filters = {}) {
    const { from, to, intent, conversationId, limit = 50 } = filters;
    const filter = {};

    if (from) filter.from_agent = from;
    if (to) filter.to_agent = to;
    if (intent) filter.intent = intent;
    if (conversationId) filter.conversation_id = conversationId;

    const docs = await AgentMessage
      .find(filter)
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();

    return docs.map(d => ({ ...d, id: d._id }));
  }
}

module.exports = new AgentMessenger();