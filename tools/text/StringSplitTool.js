const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class StringSplitTool extends Tool {
  constructor() {
    super('string_split', {
      description: 'Split string by delimiter, regex, chars, or length',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          delimiter: { type: 'string', description: 'Delimiter for split (used in delimiter mode)' },
          mode: { type: 'string', enum: ['delimiter', 'regex', 'chars', 'length'], description: 'Split mode' },
          maxParts: { type: 'number', description: 'Maximum number of parts' },
        },
        required: ['text', 'mode'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    if (!params.mode) throw new Error('mode required');
    const valid = ['delimiter', 'regex', 'chars', 'length'];
    if (!valid.includes(params.mode)) throw new Error(`Invalid mode: ${params.mode}`);
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, delimiter, mode, maxParts } = params;
      let parts;
      switch (mode) {
        case 'delimiter':
          if (!delimiter) throw new Error('delimiter required in delimiter mode');
          parts = maxParts ? text.split(delimiter, maxParts) : text.split(delimiter);
          break;
        case 'regex':
          if (!delimiter) throw new Error('regex pattern required in regex mode');
          parts = maxParts ? text.split(new RegExp(delimiter), maxParts) : text.split(new RegExp(delimiter));
          break;
        case 'chars':
          parts = text.split('');
          break;
        case 'length': {
          const len = parseInt(delimiter, 10) || 1;
          parts = [];
          for (let i = 0; i < text.length; i += len) {
            parts.push(text.slice(i, i + len));
          }
          break;
        }
        default:
          parts = [text];
      }
      return { result: parts };
    } catch (e) {
      logger.error(`StringSplitTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = StringSplitTool;
