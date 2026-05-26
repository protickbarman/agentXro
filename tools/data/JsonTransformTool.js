const Tool = require('../base/Tool');
const logger = require('../../config/logger');

function flatten(obj, prefix = '') {
  let result = {};
  for (const [key, value] of Object.entries(obj)) {
    const flatKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value, flatKey));
    } else {
      result[flatKey] = value;
    }
  }
  return result;
}

function unflatten(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length; i++) {
      if (i === parts.length - 1) {
        current[parts[i]] = value;
      } else {
        if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
    }
  }
  return result;
}

class JsonTransformTool extends Tool {
  constructor() {
    super('json_transform', {
      description: 'Transform JSON data: pick keys, omit keys, rename keys, flatten, unflatten',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'object', description: 'JSON object to transform' },
          op: { type: 'string', enum: ['pick', 'omit', 'rename', 'flatten', 'unflatten'], description: 'Operation to perform' },
          keys: { type: 'array', items: { type: 'string' }, description: 'Keys for pick/omit operations' },
          mapping: { type: 'object', description: 'Key mapping for rename operation {old: new}' },
        },
        required: ['data', 'op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.data) throw new Error('data required');
    if (!params.op) throw new Error('op required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { data, op, keys, mapping } = params;
      let result;

      switch (op) {
        case 'pick': {
          if (!keys || !Array.isArray(keys)) throw new Error('keys array required for pick');
          result = {};
          for (const key of keys) {
            if (key in data) result[key] = data[key];
          }
          break;
        }
        case 'omit': {
          if (!keys || !Array.isArray(keys)) throw new Error('keys array required for omit');
          result = { ...data };
          for (const key of keys) {
            delete result[key];
          }
          break;
        }
        case 'rename': {
          if (!mapping || typeof mapping !== 'object') throw new Error('mapping object required for rename');
          result = { ...data };
          for (const [oldKey, newKey] of Object.entries(mapping)) {
            if (oldKey in result) {
              result[newKey] = result[oldKey];
              delete result[oldKey];
            }
          }
          break;
        }
        case 'flatten':
          result = flatten(data);
          break;
        case 'unflatten':
          result = unflatten(data);
          break;
        default:
          throw new Error(`Unknown operation: ${op}`);
      }

      return { op, result };
    } catch (e) {
      logger.error('JsonTransformTool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = JsonTransformTool;
