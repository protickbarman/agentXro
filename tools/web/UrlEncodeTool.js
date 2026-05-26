const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class UrlEncodeTool extends Tool {
  constructor() {
    super('url_encode', {
      description: 'URL encode or decode a string',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'String to encode/decode' },
          direction: { type: 'string', enum: ['encode', 'decode'], description: 'Encode or decode' },
          component: { type: 'boolean', description: 'Use encodeURIComponent/decodeURIComponent vs encodeURI/decodeURI' },
        },
        required: ['value', 'direction'],
      },
    });
  }

  validate(p) {
    if (!p.value || typeof p.value !== 'string') throw new Error('value is required and must be a string');
    if (!['encode', 'decode'].includes(p.direction)) throw new Error('direction must be "encode" or "decode"');
    return true;
  }

  execute(p) {
    try {
      this.validate(p);
      let result;
      if (p.direction === 'encode') {
        result = p.component ? encodeURIComponent(p.value) : encodeURI(p.value);
      } else {
        result = p.component ? decodeURIComponent(p.value) : decodeURI(p.value);
      }
      return this.formatResult({ original: p.value, result, direction: p.direction, component: !!p.component });
    } catch (e) {
      logger.error(`UrlEncodeTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = UrlEncodeTool;
