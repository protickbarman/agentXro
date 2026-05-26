const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class JsonParseTool extends Tool {
  constructor() {
    super('json_parse', {
      description: 'Parse, validate, format, and minify JSON strings',
      parameters: {
        type: 'object',
        properties: {
          json: { type: 'string', description: 'JSON string to parse' },
          format: { type: 'boolean', description: 'Return formatted JSON string' },
          validateOnly: { type: 'boolean', description: 'Only validate, do not return data' },
        },
        required: ['json'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.json) throw new Error('json required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { json, format, validateOnly } = params;
      let data;
      let error = null;
      try {
        data = JSON.parse(json);
      } catch (e) {
        return { valid: false, data: null, error: e.message, formatted: null, size: json.length };
      }
      if (validateOnly) {
        return { valid: true, data: null, error: null, formatted: null, size: json.length };
      }
      let formatted = null;
      if (format) {
        formatted = JSON.stringify(data, null, 2);
      }
      return { valid: true, data, error: null, formatted, size: json.length };
    } catch (e) {
      logger.error('JsonParseTool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = JsonParseTool;
