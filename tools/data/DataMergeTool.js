const Tool = require('../base/Tool');
const logger = require('../../config/logger');

function deepMerge(a, b) {
  const result = { ...a };
  for (const [key, value] of Object.entries(b)) {
    if (value && typeof value === 'object' && !Array.isArray(value) &&
        result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else if (Array.isArray(value) && Array.isArray(result[key])) {
      result[key] = [...result[key], ...value];
    } else {
      result[key] = value;
    }
  }
  return result;
}

class DataMergeTool extends Tool {
  constructor() {
    super('data_merge', {
      description: 'Merge two arrays or objects with configurable mode',
      parameters: {
        type: 'object',
        properties: {
          a: { type: 'string', description: 'First value (any type)' },
          b: { type: 'string', description: 'Second value (any type)' },
          mode: { type: 'string', enum: ['shallow', 'deep', 'override'], description: 'Merge mode' },
        },
        required: ['a', 'b'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.a === undefined || params.a === null) throw new Error('a required');
    if (params.b === undefined || params.b === null) throw new Error('b required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { a, b, mode = 'shallow' } = params;
      let result;

      if (Array.isArray(a) && Array.isArray(b)) {
        result = [...a, ...b];
      } else if (typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
        switch (mode) {
          case 'shallow':
            result = { ...a, ...b };
            break;
          case 'deep':
            result = deepMerge(a, b);
            break;
          case 'override':
            result = { ...b };
            break;
          default:
            result = { ...a, ...b };
        }
      } else {
        result = b;
      }

      return { result, mode };
    } catch (e) {
      logger.error('DataMergeTool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = DataMergeTool;
