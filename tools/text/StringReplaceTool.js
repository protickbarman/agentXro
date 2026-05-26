const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class StringReplaceTool extends Tool {
  constructor() {
    super('string_replace', {
      description: 'Replace substring with literal or regex',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          search: { type: 'string', description: 'Search string or regex pattern' },
          replace: { type: 'string', description: 'Replacement string' },
          mode: { type: 'string', enum: ['literal', 'regex', 'global'], description: 'Replace mode' },
          caseSensitive: { type: 'boolean', description: 'Case sensitive matching (default true)' },
        },
        required: ['text', 'search', 'replace'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    if (!params.search) throw new Error('search required');
    if (params.replace === undefined || params.replace === null) throw new Error('replace required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, search, replace, mode = 'literal', caseSensitive = true } = params;
      let result;
      const flags = caseSensitive ? 'g' : 'gi';
      switch (mode) {
        case 'literal':
          result = caseSensitive ? text.split(search).join(replace) : text.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replace);
          break;
        case 'regex':
          result = text.replace(new RegExp(search, caseSensitive ? '' : 'i'), replace);
          break;
        case 'global':
          result = text.replace(new RegExp(search, flags), replace);
          break;
        default:
          result = text.replace(new RegExp(search, flags), replace);
      }
      return { result };
    } catch (e) {
      logger.error(`StringReplaceTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = StringReplaceTool;
