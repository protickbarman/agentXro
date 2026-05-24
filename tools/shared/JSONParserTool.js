const Tool = require('../base/Tool');
const logger = require('../../config/logger');

/**
 * JSON Parser Tool
 * Parses and validates JSON strings
 */
class JSONParserTool extends Tool {
  constructor() {
    super('json_parser', {
      description: 'Parses and validates JSON strings, can also format JSON',
      parameters: {
        type: 'object',
        properties: {
          json: {
            type: 'string',
            description: 'JSON string to parse',
          },
          format: {
            type: 'boolean',
            description: 'If true, returns formatted JSON (default: false)',
          },
          maxSize: {
            type: 'number',
            description: 'Maximum JSON size in bytes (default: 1MB)',
          },
        },
        required: ['json'],
      },
    });
    this.timeout = 5000;
  }

  /**
   * Validate input
   */
  validate(params) {
    if (!params.json) {
      throw new Error('JSON string is required');
    }
    if (typeof params.json !== 'string') {
      throw new Error('JSON must be a string');
    }
    return true;
  }

  /**
   * Execute parsing
   */
  async execute(params) {
    try {
      this.validate(params);

      const { json, format = false, maxSize = 1024 * 1024 } = params;

      // Check size
      if (json.length > maxSize) {
        throw new Error(`JSON exceeds maximum size of ${maxSize} bytes`);
      }

      logger.debug('JSON parser executing');

      // Parse JSON
      const parsed = JSON.parse(json);

      // Return result
      let result = parsed;
      if (format) {
        result = JSON.stringify(parsed, null, 2);
      }

      return {
        valid: true,
        parsed: result,
        size: json.length,
        formatted: format,
        type: Array.isArray(parsed) ? 'array' : typeof parsed,
      };
    } catch (error) {
      logger.error(`JSON parsing failed: ${error.message}`);

      // Try to provide helpful error info
      let errorLine = 1;
      let errorColumn = 1;
      const match = error.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1]);
        const lines = params.json.substring(0, pos).split('\n');
        errorLine = lines.length;
        errorColumn = lines[lines.length - 1].length;
      }

      return {
        valid: false,
        error: error.message,
        errorLine,
        errorColumn,
      };
    }
  }
}

module.exports = JSONParserTool;
