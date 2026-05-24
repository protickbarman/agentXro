const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const agentRegistry = require('../agents/AgentRegistry');

/**
 * AgentMessenger - Agent-to-Agent communication system
 * Part of Agent-to-Agent Communication skill
 */
class AgentMessenger {
  constructor() {
    this.handlers = new Map();
    this.pendingResponses = new Map();
    this.DEFAULT_TIMEOUT = 30000;
  }

  /**
   * Send a message from one agent to another
   * @param {string} from - Source agent name
   * @param {string|string[]} to - Target agent(s)
   * @param {object} message - Message content
   * @returns {Promise<object>}
   */
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

  /**
   * Send and wait for a specific response
   * @param {string} from - Source agent
   * @param {string} to - Target agent
   * @param {object} message - Message
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<object>}
   */
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

  /**
   * Broadcast message to all agents of a type
   * @param {string} from - Source agent
   * @param {string} agentType - Agent type to target
   * @param {object} message - Message
   * @returns {Promise<Array>}
   */
  async broadcastByType(from, agentType, message) {
    const targets = [];
    for (const [name, agent] of agentRegistry.getAll()) {
      if (agent.type === agentType) {
        targets.push(name);
      }
    }
    return this.send(from, targets, message);
  }

  /**
   * Broadcast to all agents
   * @param {string} from - Source agent
   * @param {object} message - Message
   * @returns {Promise<Array>}
   */
  async broadcastAll(from, message) {
    const targets = Array.from(agentRegistry.getNames()).filter(n => n !== from);
    return this.send(from, targets, { ...message, metadata: { ...message.metadata, broadcast: true } });
  }

  /**
   * Reply to a message
   * @param {object} originalMessage - Original message
   * @param {object} response - Response data
   * @returns {Promise<object>}
   */
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

  /**
   * Check if an agent is available
   * @param {string} agentName - Agent name
   * @returns {boolean}
   */
  isAvailable(agentName) {
    return agentRegistry.has(agentName);
  }

  /**
   * Register a message handler for an agent
   * @param {string} agentName - Agent name
   * @param {string} intent - Message intent to handle
   * @param {Function} handler - Handler function
   */
  registerHandler(agentName, intent, handler) {
    const key = `${agentName}:${intent}`;
    this.handlers.set(key, handler);
    logger.info(`Message handler registered: ${key}`);
  }

  async _logMessage(message) {
    try {
      await query(
        `INSERT INTO agent_messages (id, message_type, from_agent, to_agent, intent, payload, 
          correlation_id, conversation_id, requires_response)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [message.id, message.type, message.from, message.to,
         message.content.intent, JSON.stringify(message.content.payload),
         message.metadata.correlationId, message.conversation?.id,
         message.metadata.requiresResponse !== false]
      );
    } catch (err) {
      logger.error(`Failed to log agent message: ${err.message}`);
    }
  }

  async _logResponse(messageId, responses) {
    try {
      const status = responses.some(r => r.error) ? 'partial' : 'success';
      await query(
        `UPDATE agent_messages SET status = $1, responded_at = NOW() WHERE id = $2`,
        [status, messageId]
      );
    } catch (err) {
      logger.error(`Failed to log message response: ${err.message}`);
    }
  }

  /**
   * Get message history
   * @param {object} filters - Filter options
   * @returns {Promise<Array>}
   */
  async getHistory(filters = {}) {
    const { from, to, intent, conversationId, limit = 50 } = filters;
    let sql = 'SELECT * FROM agent_messages WHERE 1=1';
    const params = [];
    let idx = 1;

    if (from) { sql += ` AND from_agent = $${idx}`; params.push(from); idx++; }
    if (to) { sql += ` AND $${idx} = ANY(to_agent)`; params.push(to); idx++; }
    if (intent) { sql += ` AND intent = $${idx}`; params.push(intent); idx++; }
    if (conversationId) { sql += ` AND conversation_id = $${idx}`; params.push(conversationId); idx++; }

    sql += ' ORDER BY created_at DESC LIMIT $' + idx;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows;
  }
}

module.exports = new AgentMessenger();
