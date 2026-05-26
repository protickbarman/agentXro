const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class SlugifyTool extends Tool {
  constructor() {
    super('slugify', {
      description: 'Convert text to URL-safe slug',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          separator: { type: 'string', description: 'Word separator (default -)' },
          lowercase: { type: 'boolean', description: 'Convert to lowercase (default true)' },
          maxLength: { type: 'number', description: 'Maximum slug length' },
        },
        required: ['text'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, separator = '-', lowercase = true, maxLength } = params;
      let slug = text
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, separator)
        .replace(new RegExp(`${separator}+`, 'g'), separator)
        .replace(new RegExp(`^${separator}|${separator}$`, 'g'), '');
      if (lowercase) slug = slug.toLowerCase();
      if (maxLength) slug = slug.slice(0, maxLength).replace(new RegExp(`${separator}+$`), '');
      return { result: slug };
    } catch (e) {
      logger.error(`SlugifyTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = SlugifyTool;
