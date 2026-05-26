const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class Base64Tool extends Tool {
  constructor() {
    super('base64', {
      description: 'Encode or decode base64 strings',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'String to encode or decode' },
          direction: { type: 'string', enum: ['encode', 'decode'], description: 'Encode or decode' },
          charset: { type: 'string', description: 'Character set for encoding (e.g. utf8)' },
        },
        required: ['value', 'direction'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.value) throw new Error('value required');
    if (!params.direction) throw new Error('direction required');
    if (!['encode', 'decode'].includes(params.direction)) throw new Error('direction must be encode or decode');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, direction, charset = 'utf8' } = params;
      let result;
      if (direction === 'encode') {
        result = Buffer.from(value, charset).toString('base64');
      } else {
        result = Buffer.from(value, 'base64').toString(charset);
      }
      return { value: result, direction, charset };
    } catch (e) {
      logger.error('Base64Tool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = Base64Tool;
