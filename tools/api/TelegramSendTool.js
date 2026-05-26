const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class TelegramSendTool extends Tool {
  constructor() {
    super('telegram_send', {
      description: 'Send a Telegram message via Bot API',
      parameters: {
        type: 'object',
        properties: {
          botToken: { type: 'string', description: 'Telegram bot token' },
          chatId: { type: 'string', description: 'Chat ID (user or group)' },
          text: { type: 'string', description: 'Message text' },
        },
        required: ['botToken', 'chatId', 'text'],
      },
    });
    this.timeout = 10000;
  }

  validate(p) {
    if (!p.botToken || typeof p.botToken !== 'string') throw new Error('botToken is required');
    if (!p.chatId || typeof p.chatId !== 'string') throw new Error('chatId is required');
    if (!p.text || typeof p.text !== 'string') throw new Error('text is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const url = `https://api.telegram.org/bot${p.botToken}/sendMessage`;
      const res = await axios.post(url, { chat_id: p.chatId, text: p.text }, { timeout: this.timeout });
      return this.formatResult({ success: true, messageId: res.data.result?.message_id, chat: p.chatId });
    } catch (e) {
      logger.error(`TelegramSendTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = TelegramSendTool;
