const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class StringTrimTool extends Tool {
  constructor() {
    super('string_trim', {
      description: 'Trim whitespace or specific characters from string',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          mode: { type: 'string', enum: ['both', 'start', 'end'], description: 'Which side to trim' },
          chars: { type: 'string', description: 'Characters to trim (default whitespace)' },
        },
        required: ['text'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, mode = 'both', chars } = params;
      let result;
      if (chars) {
        const escaped = chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`^[${escaped}]+|[${escaped}]+$`, 'g');
        const reStart = new RegExp(`^[${escaped}]+`, 'g');
        const reEnd = new RegExp(`[${escaped}]+$`, 'g');
        switch (mode) {
          case 'both':
            result = text.replace(re, '');
            break;
          case 'start':
            result = text.replace(reStart, '');
            break;
          case 'end':
            result = text.replace(reEnd, '');
            break;
          default:
            result = text.trim();
        }
      } else {
        switch (mode) {
          case 'both':
            result = text.trim();
            break;
          case 'start':
            result = text.trimStart();
            break;
          case 'end':
            result = text.trimEnd();
            break;
          default:
            result = text.trim();
        }
      }
      return { result };
    } catch (e) {
      logger.error(`StringTrimTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = StringTrimTool;
