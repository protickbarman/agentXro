const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class SlackSendTool extends Tool {
  constructor() {
    super('slack_send', {
      description: 'Send a message to Slack via webhook',
      parameters: {
        type: 'object',
        properties: {
          webhookUrl: { type: 'string', description: 'Slack webhook URL' },
          message: { type: 'string', description: 'Message text to send' },
          channel: { type: 'string', description: 'Slack channel override' },
          username: { type: 'string', description: 'Bot username override' },
        },
        required: ['webhookUrl', 'message'],
      },
    });
    this.timeout = 10000;
  }

  validate(p) {
    if (!p.webhookUrl || typeof p.webhookUrl !== 'string') throw new Error('webhookUrl is required');
    if (!p.message || typeof p.message !== 'string') throw new Error('message is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const payload = { text: p.message };
      if (p.channel) payload.channel = p.channel;
      if (p.username) payload.username = p.username;
      await axios.post(p.webhookUrl, payload, { timeout: this.timeout });
      return this.formatResult({ success: true, channel: p.channel || 'default', messageLength: p.message.length });
    } catch (e) {
      logger.error(`SlackSendTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = SlackSendTool;
