const { mongoose } = require('../config/mongodb');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const logger = require('../config/logger');

const integrationSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  type: { type: String, required: true },
  name: { type: String, required: true },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
  triggers: { type: mongoose.Schema.Types.Mixed, default: [] },
  created_by: { type: String },
  is_active: { type: Boolean, default: true },
  last_health_check: { type: Date, default: null },
  last_error: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, { versionKey: false });

const webhookEventSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  integration_type: { type: String, required: true },
  event_type: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

const integrationLogSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  integration_id: { type: String, required: true, index: true },
  action: { type: String, required: true },
  params: { type: mongoose.Schema.Types.Mixed, default: {} },
  result: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, required: true },
  execution_time_ms: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

const Integration = mongoose.models.Integration || mongoose.model('Integration', integrationSchema, 'integrations');
const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', webhookEventSchema, 'webhook_events');
const IntegrationLog = mongoose.models.IntegrationLog || mongoose.model('IntegrationLog', integrationLogSchema, 'integration_logs');

class IntegrationManager {
  constructor() {
    this.integrations = new Map();
    this.clients = new Map();
    this._init();
  }

  _init() {
    this._registerClientFactories();
  }

  _registerClientFactories() {
    this.clientFactories = {
      slack: this._createSlackClient.bind(this),
      github: this._createGitHubClient.bind(this),
      discord: this._createDiscordClient.bind(this),
      jira: this._createJiraClient.bind(this),
    };
  }

  async register(config) {
    const { type, name, config: serviceConfig, permissions, triggers, createdBy } = config;

    if (!type || !name) throw new Error('Integration type and name required');
    if (!this.clientFactories[type]) throw new Error(`Unsupported integration type: ${type}`);

    const id = uuidv4();
    await Integration.create({
      _id: id,
      type,
      name,
      config: serviceConfig || {},
      permissions: permissions || {},
      triggers: triggers || [],
      created_by: createdBy || null,
    });

    const client = await this.clientFactories[type](id, serviceConfig);
    this.clients.set(id, client);
    this.integrations.set(id, { id, type, name, config: serviceConfig, permissions, triggers });

    logger.info(`Integration registered: ${name} (${type})`);
    return { id, type, name };
  }

  async execute(id, action, params = {}) {
    const client = this.clients.get(id);
    if (!client) throw new Error(`Integration not found: ${id}`);
    if (!client[action]) throw new Error(`Action "${action}" not supported for this integration`);

    const startTime = Date.now();
    try {
      const result = await client[action](params);
      await this._logExecution(id, action, params, result, 'success', Date.now() - startTime);
      return result;
    } catch (error) {
      await this._logExecution(id, action, params, { error: error.message }, 'failed', Date.now() - startTime);
      throw error;
    }
  }

  async handleWebhook(type, payload) {
    const eventType = payload.type || payload.action || 'unknown';

    await WebhookEvent.create({
      integration_type: type,
      event_type: eventType,
      payload: payload || {},
    });

    for (const [id, integration] of this.integrations) {
      if (integration.type !== type) continue;
      for (const trigger of integration.triggers || []) {
        if (trigger.event === eventType) {
          try {
            await this.execute(id, trigger.action, { webhook: payload });
          } catch (err) {
            logger.error(`Webhook trigger failed for ${id}: ${err.message}`);
          }
        }
      }
    }

    return { received: true, eventType };
  }

  async test(id) {
    const client = this.clients.get(id);
    if (!client) throw new Error(`Integration not found: ${id}`);

    const startTime = Date.now();
    try {
      const result = await client.healthCheck();
      const latency = Date.now() - startTime;

      await Integration.findByIdAndUpdate(id, {
        last_health_check: new Date(),
        last_error: null,
        updated_at: new Date(),
      });

      return { status: 'healthy', latency, result };
    } catch (error) {
      const latency = Date.now() - startTime;

      await Integration.findByIdAndUpdate(id, {
        last_health_check: new Date(),
        last_error: error.message,
        updated_at: new Date(),
      });

      return { status: 'unhealthy', latency, error: error.message };
    }
  }

  getStatus() {
    return {
      total: this.integrations.size,
      connected: this.clients.size,
      types: [...new Set(Array.from(this.integrations.values()).map(i => i.type))],
      clients: Array.from(this.integrations.entries()).map(([id, int]) => ({
        id, name: int.name, type: int.type,
      })),
      activeFactories: Object.keys(this.clientFactories),
    };
  }

  async list() {
    const docs = await Integration
      .find({})
      .sort({ created_at: -1 })
      .lean();

    return docs.map(d => ({ ...d, id: d._id }));
  }

  async update(id, updates) {
    const { config, permissions, triggers, isActive } = updates;
    const $set = {};

    if (config) $set.config = config;
    if (permissions) $set.permissions = permissions;
    if (triggers) $set.triggers = triggers;
    if (isActive !== undefined) $set.is_active = isActive;
    $set.updated_at = new Date();

    const result = await Integration.findByIdAndUpdate(id, { $set }, { new: true }).lean();

    if (result && config) {
      const client = await this.clientFactories[result.type](id, config);
      this.clients.set(id, client);
    }

    return result ? { ...result, id: result._id } : null;
  }

  async remove(id) {
    const result = await Integration.findByIdAndDelete(id);
    this.clients.delete(id);
    this.integrations.delete(id);
    return !!result;
  }

  async _createSlackClient(id, config) {
    const { SlackClient } = require('../services/integrations/SlackClient');
    return new SlackClient(config);
  }

  async _createGitHubClient(id, config) {
    const { GitHubClient } = require('../services/integrations/GitHubClient');
    return new GitHubClient(config);
  }

  async _createDiscordClient(id, config) {
    const { DiscordClient } = require('../services/integrations/DiscordClient');
    return new DiscordClient(config);
  }

  async _createJiraClient(id, config) {
    const { JiraClient } = require('../services/integrations/JiraClient');
    return new JiraClient(config);
  }

  async _logExecution(integrationId, action, params, result, status, duration) {
    try {
      await IntegrationLog.create({
        integration_id: integrationId,
        action,
        params: params || {},
        result: result || {},
        status,
        execution_time_ms: duration,
      });
    } catch (err) {
      logger.error(`Failed to log integration execution: ${err.message}`);
    }
  }
}

module.exports = new IntegrationManager();