const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class ObjectPathTool extends Tool {
  constructor() {
    super('object_path', {
      description: 'Get/set/delete/has nested property by dot path',
      parameters: {
        type: 'object',
        properties: {
          obj: { type: 'object', description: 'Object to operate on' },
          path: { type: 'string', description: 'Dot-separated path' },
          value: { type: 'string', description: 'Value for set operation' },
          op: { type: 'string', enum: ['get', 'set', 'del', 'has'], description: 'Operation' },
        },
        required: ['obj', 'path', 'op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.obj || typeof params.obj !== 'object') throw new Error('obj required and must be an object');
    if (!params.path) throw new Error('path required');
    if (!params.op) throw new Error('op required');
    return true;
  }

  _resolve(obj, path) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] === undefined || current[keys[i]] === null) return { found: false, parent: null, key: keys[i] };
      current = current[keys[i]];
    }
    return { found: true, parent: current, key: keys[keys.length - 1] };
  }

  async execute(params) {
    try {
      this.validate(params);
      const { obj, path, value, op } = params;
      const parsed = JSON.parse(JSON.stringify(obj));

      switch (op) {
        case 'get': {
          const { found, parent, key } = this._resolve(parsed, path);
          return { path, value: found ? parent[key] : undefined, found };
        }
        case 'set': {
          const keys = path.split('.');
          let current = parsed;
          for (let i = 0; i < keys.length - 1; i++) {
            if (current[keys[i]] === undefined) current[keys[i]] = {};
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;
          return { path, value, obj: parsed };
        }
        case 'del': {
          const { found, parent, key } = this._resolve(parsed, path);
          if (found) delete parent[key];
          return { path, deleted: found, obj: parsed };
        }
        case 'has': {
          const { found } = this._resolve(parsed, path);
          return { path, has: found };
        }
        default:
          throw new Error(`Unknown operation: ${op}`);
      }
    } catch (e) {
      logger.error(`ObjectPathTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = ObjectPathTool;
