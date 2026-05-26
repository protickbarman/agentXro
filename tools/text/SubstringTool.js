const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class SubstringTool extends Tool {
  constructor() {
    super('substring', {
      description: 'Find, count, extract, or locate substrings',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          pattern: { type: 'string', description: 'Pattern to search for' },
          op: { type: 'string', enum: ['find', 'count', 'extract_before', 'extract_after', 'index_of', 'last_index_of'], description: 'Operation to perform' },
        },
        required: ['text', 'pattern', 'op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    if (!params.pattern) throw new Error('pattern required');
    if (!params.op) throw new Error('op required');
    const valid = ['find', 'count', 'extract_before', 'extract_after', 'index_of', 'last_index_of'];
    if (!valid.includes(params.op)) throw new Error(`Invalid op: ${params.op}`);
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, pattern, op } = params;
      let result;
      switch (op) {
        case 'find': {
          const idx = text.indexOf(pattern);
          result = idx !== -1 ? { found: true, index: idx, match: pattern } : { found: false, index: -1, match: null };
          break;
        }
        case 'count': {
          let count = 0;
          let pos = 0;
          while ((pos = text.indexOf(pattern, pos)) !== -1) {
            count++;
            pos += pattern.length;
          }
          result = count;
          break;
        }
        case 'extract_before': {
          const idx = text.indexOf(pattern);
          result = idx !== -1 ? text.slice(0, idx) : '';
          break;
        }
        case 'extract_after': {
          const idx = text.indexOf(pattern);
          result = idx !== -1 ? text.slice(idx + pattern.length) : '';
          break;
        }
        case 'index_of':
          result = text.indexOf(pattern);
          break;
        case 'last_index_of':
          result = text.lastIndexOf(pattern);
          break;
        default:
          result = null;
      }
      return { result };
    } catch (e) {
      logger.error(`SubstringTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = SubstringTool;
