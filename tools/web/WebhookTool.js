const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class WebhookTool extends Tool {
  constructor() {
    super('webhook', {
      description: 'Send a webhook via HTTP POST',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Webhook URL' },
          payload: { type: 'object', description: 'Webhook payload' },
          method: { type: 'string', enum: ['POST', 'PUT'], description: 'HTTP method' },
        },
        required: ['url', 'payload'],
      },
    });
    this.timeout = 15000;
  }

  validate(p) {
    if (!p.url || typeof p.url !== 'string') throw new Error('url is required');
    if (!p.payload || typeof p.payload !== 'object') throw new Error('payload is required and must be an object');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const method = (p.method || 'POST').toLowerCase();
      const res = await axios[method](p.url, p.payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: p.timeout || this.timeout,
      });
      return this.formatResult({ status: res.status, statusText: res.statusText, data: res.data });
    } catch (e) {
      logger.error(`WebhookTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = WebhookTool;
