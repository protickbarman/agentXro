const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class StringSliceTool extends Tool {
  constructor() {
    super('string_slice', {
      description: 'Extract substring by start/end index',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          start: { type: 'number', description: 'Start index (inclusive)' },
          end: { type: 'number', description: 'End index (exclusive)' },
        },
        required: ['text', 'start'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    if (params.start === undefined || params.start === null) throw new Error('start required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, start, end } = params;
      const result = end !== undefined ? text.slice(start, end) : text.slice(start);
      return { result };
    } catch (e) {
      logger.error(`StringSliceTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = StringSliceTool;
