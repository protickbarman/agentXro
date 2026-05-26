const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class TemplateTool extends Tool {
  constructor() {
    super('template', {
      description: 'Simple template replacement of {{key}} with values',
      parameters: {
        type: 'object',
        properties: {
          template: { type: 'string', description: 'Template string with {{key}} placeholders' },
          data: { type: 'object', description: 'Key-value pairs for replacement' },
          delimiter: { type: 'string', description: 'Custom delimiter regex group (default \\{\\{([^}]+)\\}\\})' },
        },
        required: ['template', 'data'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.template) throw new Error('template required');
    if (!params.data) throw new Error('data required');
    if (typeof params.data !== 'object' || Array.isArray(params.data)) throw new Error('data must be an object');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { template, data, delimiter } = params;
      const re = delimiter ? new RegExp(delimiter, 'g') : /\{\{([^}]+)\}\}/g;
      const result = template.replace(re, (match, key) => {
        const trimmedKey = key.trim();
        return data[trimmedKey] !== undefined ? String(data[trimmedKey]) : match;
      });
      return { result };
    } catch (e) {
      logger.error(`TemplateTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = TemplateTool;
