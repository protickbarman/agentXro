const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class StringCaseTool extends Tool {
  constructor() {
    super('string_case', {
      description: 'Convert string case: upper, lower, title, camelCase, snake_case, kebab-case, PascalCase, swap_case',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          format: { type: 'string', enum: ['upper', 'lower', 'title', 'camel', 'snake', 'kebab', 'pascal', 'swap'], description: 'Target case format' },
        },
        required: ['text', 'format'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    if (!params.format) throw new Error('format required');
    const valid = ['upper', 'lower', 'title', 'camel', 'snake', 'kebab', 'pascal', 'swap'];
    if (!valid.includes(params.format)) throw new Error(`Invalid format: ${params.format}`);
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, format } = params;
      let result;
      switch (format) {
        case 'upper':
          result = text.toUpperCase();
          break;
        case 'lower':
          result = text.toLowerCase();
          break;
        case 'title':
          result = text.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
          break;
        case 'camel':
          result = text.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^[A-Z]/, c => c.toLowerCase());
          break;
        case 'snake':
          result = text.replace(/([A-Z])/g, '_$1').replace(/[-_\s]+/g, '_').replace(/^_/, '').toLowerCase();
          break;
        case 'kebab':
          result = text.replace(/([A-Z])/g, '-$1').replace(/[_\s]+/g, '-').replace(/^-/, '').toLowerCase();
          break;
        case 'pascal':
          result = text.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^[a-z]/, c => c.toUpperCase());
          break;
        case 'swap':
          result = text.replace(/[a-zA-Z]/g, c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase());
          break;
        default:
          result = text;
      }
      return { result };
    } catch (e) {
      logger.error(`StringCaseTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = StringCaseTool;
