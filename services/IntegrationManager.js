const { query, getOne, getMany } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const logger = require('../config/logger');

/**
 * IntegrationManager - External service integration hub
 * Part of External Integrations skill
 */
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

  /**
   * Register a new integration
   * @param {object} config - Integration configuration
   * @returns {Promise<object>}
   */
  async register(config) {
    const { type, name, config: serviceConfig, permissions, triggers, createdBy } = config;

    if (!type || !name) throw new Error('Integration type and name required');
    if (!this.clientFactories[type]) throw new Error(`Unsupported integration type: ${type}`);

    const id = uuidv4();
    await query(
      `INSERT INTO integrations (id, type, name, config, permissions, triggers, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, type, name, JSON.stringify(serviceConfig), JSON.stringify(permissions || {}),
       JSON.stringify(triggers || []), createdBy || null]
    );

    const client = await this.clientFactories[type](id, serviceConfig);
    this.clients.set(id, client);
    this.integrations.set(id, { id, type, name, config: serviceConfig, permissions, triggers });

    logger.info(`Integration registered: ${name} (${type})`);
    return { id, type, name };
  }

  /**
   * Execute an integration action
   * @param {string} id - Integration ID
   * @param {string} action - Action name
   * @param {object} params - Action parameters
   * @returns {Promise<object>}
   */
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

  /**
   * Handle incoming webhook
   * @param {string} type - Integration type
   * @param {object} payload - Webhook payload
   * @returns {Promise<object>}
   */
  async handleWebhook(type, payload) {
    const eventType = payload.type || payload.action || 'unknown';

    await query(
      `INSERT INTO webhook_events (integration_type, event_type, payload)
       VALUES ($1, $2, $3) RETURNING id`,
      [type, eventType, JSON.stringify(payload)]
    );

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

  /**
   * Test integration connectivity
   * @param {string} id - Integration ID
   * @returns {Promise<object>}
   */
  async test(id) {
    const client = this.clients.get(id);
    if (!client) throw new Error(`Integration not found: ${id}`);

    const startTime = Date.now();
    try {
      const result = await client.healthCheck();
      const latency = Date.now() - startTime;

      await query(
        `UPDATE integrations SET last_health_check = NOW(), last_error = NULL WHERE id = $1`,
        [id]
      );

      return { status: 'healthy', latency, result };
    } catch (error) {
      const latency = Date.now() - startTime;

      await query(
        `UPDATE integrations SET last_health_check = NOW(), last_error = $1 WHERE id = $2`,
        [error.message, id]
      );

      return { status: 'unhealthy', latency, error: error.message };
    }
  }

  /**
   * Get overall integration system status
   * @returns {object}
   */
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

  /**
   * List all registered integrations
   * @returns {Promise<Array>}
   */
  async list() {
    const result = await query(
      `SELECT id, type, name, permissions, is_active, last_health_check, last_error, created_at
       FROM integrations ORDER BY created_at DESC`
    );
    return result.rows;
  }

  /**
   * Update integration configuration
   * @param {string} id - Integration ID
   * @param {object} updates - Update fields
   * @returns {Promise<object>}
   */
  async update(id, updates) {
    const { config, permissions, triggers, isActive } = updates;
    const fields = [];
    const values = [];
    let idx = 1;

    if (config) { fields.push(`config = $${idx}`); values.push(JSON.stringify(config)); idx++; }
    if (permissions) { fields.push(`permissions = $${idx}`); values.push(JSON.stringify(permissions)); idx++; }
    if (triggers) { fields.push(`triggers = $${idx}`); values.push(JSON.stringify(triggers)); idx++; }
    if (isActive !== undefined) { fields.push(`is_active = $${idx}`); values.push(isActive); idx++; }

    if (fields.length === 0) return null;
    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `UPDATE integrations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows[0]) {
      if (config) {
        const client = await this.clientFactories[result.rows[0].type](id, config);
        this.clients.set(id, client);
      }
    }

    return result.rows[0];
  }

  /**
   * Remove an integration
   * @param {string} id - Integration ID
   * @returns {Promise<boolean>}
   */
  async remove(id) {
    const result = await query('DELETE FROM integrations WHERE id = $1', [id]);
    this.clients.delete(id);
    this.integrations.delete(id);
    return result.rowCount > 0;
  }

  // ─── Client Factories ────────────────────────────────────────────

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

  // ─── Internal ────────────────────────────────────────────────────

  async _logExecution(integrationId, action, params, result, status, duration) {
    try {
      await query(
        `INSERT INTO integration_logs (integration_id, action, params, result, status, execution_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [integrationId, action, JSON.stringify(params), JSON.stringify(result), status, duration]
      );
    } catch (err) {
      logger.error(`Failed to log integration execution: ${err.message}`);
    }
  }
}

module.exports = new IntegrationManager();
