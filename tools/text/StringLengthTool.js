const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class StringLengthTool extends Tool {
  constructor() {
    super('string_length', {
      description: 'Count characters, words, lines, or bytes in text',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          unit: { type: 'string', enum: ['chars', 'words', 'lines', 'bytes'], description: 'Unit to count' },
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
      const { text, unit = 'chars' } = params;
      let count;
      switch (unit) {
        case 'chars':
          count = text.length;
          break;
        case 'words':
          count = text.trim() ? text.trim().split(/\s+/).length : 0;
          break;
        case 'lines':
          count = text.split('\n').length;
          break;
        case 'bytes':
          count = Buffer.byteLength(text, 'utf-8');
          break;
        default:
          count = text.length;
      }
      return { result: count };
    } catch (e) {
      logger.error(`StringLengthTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = StringLengthTool;
