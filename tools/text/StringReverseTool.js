const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class StringReverseTool extends Tool {
  constructor() {
    super('string_reverse', {
      description: 'Reverse string characters or words',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          mode: { type: 'string', enum: ['chars', 'words'], description: 'Reverse mode' },
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
      const { text, mode = 'chars' } = params;
      let result;
      switch (mode) {
        case 'chars':
          result = text.split('').reverse().join('');
          break;
        case 'words':
          result = text.split(/\s+/).reverse().join(' ');
          break;
        default:
          result = text.split('').reverse().join('');
      }
      return { result };
    } catch (e) {
      logger.error(`StringReverseTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = StringReverseTool;
