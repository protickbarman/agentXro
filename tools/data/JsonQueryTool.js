const Tool = require('../base/Tool');
const logger = require('../../config/logger');

function getByPath(obj, path) {
  const parts = path.split('.').flatMap(p => {
    const match = p.match(/^(\w+)(?:\[(\d+)\])?$/);
    if (!match) return [p];
    return match[2] !== undefined ? [match[1], parseInt(match[2], 10)] : [match[1]];
  });
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

class JsonQueryTool extends Tool {
  constructor() {
    super('json_query', {
      description: 'Query JSON data using dot/path notation (e.g. a.b[0].c)',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'object', description: 'JSON object to query' },
          path: { type: 'string', description: 'Dot/path notation path' },
        },
        required: ['data', 'path'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.data) throw new Error('data required');
    if (!params.path) throw new Error('path required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { data, path } = params;
      const value = getByPath(data, path);
      return { value, path, found: value !== undefined };
    } catch (e) {
      logger.error('JsonQueryTool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = JsonQueryTool;
