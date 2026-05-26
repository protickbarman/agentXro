const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class DiscordWebhookTool extends Tool {
  constructor() {
    super('discord_webhook', {
      description: 'Send a message to Discord via webhook',
      parameters: {
        type: 'object',
        properties: {
          webhookUrl: { type: 'string', description: 'Discord webhook URL' },
          content: { type: 'string', description: 'Message content' },
          username: { type: 'string', description: 'Override username' },
        },
        required: ['webhookUrl', 'content'],
      },
    });
    this.timeout = 10000;
  }

  validate(p) {
    if (!p.webhookUrl || typeof p.webhookUrl !== 'string') throw new Error('webhookUrl is required');
    if (!p.content || typeof p.content !== 'string') throw new Error('content is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const payload = { content: p.content };
      if (p.username) payload.username = p.username;
      await axios.post(p.webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: this.timeout,
      });
      return this.formatResult({ success: true, contentLength: p.content.length });
    } catch (e) {
      logger.error(`DiscordWebhookTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = DiscordWebhookTool;
