const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class DeepCloneTool extends Tool {
  constructor() {
    super('deep_clone', {
      description: 'Deep clone JSON-compatible values plus Date and RegExp',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'Value to clone' },
        },
        required: ['value'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.value === undefined) throw new Error('value required');
    return true;
  }

  _clone(val) {
    if (val instanceof Date) return new Date(val.getTime());
    if (val instanceof RegExp) return new RegExp(val.source, val.flags);
    if (Array.isArray(val)) return val.map(v => this._clone(v));
    if (val !== null && typeof val === 'object') {
      const cloned = {};
      for (const key of Object.keys(val)) {
        cloned[key] = this._clone(val[key]);
      }
      return cloned;
    }
    return val;
  }

  async execute(params) {
    try {
      this.validate(params);
      const cloned = this._clone(params.value);
      const originalType = Array.isArray(params.value) ? 'array' : typeof params.value;
      return { cloned, type: originalType, deep: true };
    } catch (e) {
      logger.error(`DeepCloneTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = DeepCloneTool;
