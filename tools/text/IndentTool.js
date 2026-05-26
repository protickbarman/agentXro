const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class IndentTool extends Tool {
  constructor() {
    super('indent', {
      description: 'Add or remove indentation from text',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          level: { type: 'number', description: 'Indentation level' },
          char: { type: 'string', description: 'Indent character (default space)' },
          op: { type: 'string', enum: ['add', 'remove'], description: 'Operation to perform' },
        },
        required: ['text', 'level'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    if (params.level === undefined || params.level === null) throw new Error('level required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, level, char = ' ', op = 'add' } = params;
      const lines = text.split('\n');
      let result;
      switch (op) {
        case 'add': {
          const indent = char.repeat(level);
          result = lines.map(line => indent + line).join('\n');
          break;
        }
        case 'remove': {
          const re = new RegExp(`^${char.repeat(level)}`);
          result = lines.map(line => line.replace(re, '')).join('\n');
          break;
        }
        default:
          result = text;
      }
      return { result };
    } catch (e) {
      logger.error(`IndentTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = IndentTool;
