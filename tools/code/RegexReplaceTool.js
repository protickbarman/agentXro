const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class RegexReplaceTool extends Tool {
  constructor() {
    super('regex_replace', {
      description: 'Find and replace text using regular expressions',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regular expression pattern' },
          replacement: { type: 'string', description: 'Replacement string (supports $1, $&, etc.)' },
          text: { type: 'string', description: 'Input text' },
          flags: { type: 'string', description: 'Regex flags (g, i, m, s, u)' },
        },
        required: ['pattern', 'replacement', 'text'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.pattern) throw new Error('pattern required');
    if (params.replacement === undefined || params.replacement === null) throw new Error('replacement required');
    if (params.text === undefined || params.text === null) throw new Error('text required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { pattern, replacement, text, flags = 'g' } = params;
      let regex;
      try {
        regex = new RegExp(pattern, flags);
      } catch (e) {
        throw new Error(`Invalid regex: ${e.message}`);
      }
      const result = text.replace(regex, replacement);
      return { pattern, replacement, flags, result, changed: result !== text };
    } catch (e) {
      logger.error(`RegexReplaceTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = RegexReplaceTool;
