const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class StringJoinTool extends Tool {
  constructor() {
    super('string_join', {
      description: 'Join array elements with delimiter',
      parameters: {
        type: 'object',
        properties: {
          parts: { type: 'array', items: { type: 'string' }, description: 'Array of strings to join' },
          delimiter: { type: 'string', description: 'Delimiter between elements' },
          lastDelimiter: { type: 'string', description: 'Delimiter before the last element' },
        },
        required: ['parts'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.parts) throw new Error('parts required');
    if (!Array.isArray(params.parts)) throw new Error('parts must be an array');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { parts, delimiter = '', lastDelimiter } = params;
      let result;
      if (lastDelimiter && parts.length > 1) {
        const head = parts.slice(0, -1).join(delimiter);
        result = head + lastDelimiter + parts[parts.length - 1];
      } else {
        result = parts.join(delimiter);
      }
      return { result };
    } catch (e) {
      logger.error(`StringJoinTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = StringJoinTool;
