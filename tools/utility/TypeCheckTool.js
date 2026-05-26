const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class TypeCheckTool extends Tool {
  constructor() {
    super('type_check', {
      description: 'Check typeof value, isArray, isObject, isNull, isDate, isRegExp, isEmpty',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'Value to check' },
          op: { type: 'string', enum: ['type', 'is_array', 'is_object', 'is_null', 'is_date', 'is_regexp', 'is_empty', 'is_number', 'is_string', 'is_boolean'], description: 'Type check operation' },
        },
        required: ['value', 'op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.value === undefined) throw new Error('value required');
    if (!params.op) throw new Error('op required');
    return true;
  }

  _isEmpty(val) {
    if (val === null || val === undefined) return true;
    if (typeof val === 'string') return val.length === 0;
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'object') return Object.keys(val).length === 0;
    return false;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, op } = params;
      let result;

      switch (op) {
        case 'type': result = typeof value; break;
        case 'is_array': result = Array.isArray(value); break;
        case 'is_object': result = value !== null && typeof value === 'object' && !Array.isArray(value); break;
        case 'is_null': result = value === null; break;
        case 'is_date': result = value instanceof Date; break;
        case 'is_regexp': result = value instanceof RegExp; break;
        case 'is_empty': result = this._isEmpty(value); break;
        case 'is_number': result = typeof value === 'number' && !isNaN(value); break;
        case 'is_string': result = typeof value === 'string'; break;
        case 'is_boolean': result = typeof value === 'boolean'; break;
        default: throw new Error(`Unknown op: ${op}`);
      }

      return { value, op, result };
    } catch (e) {
      logger.error(`TypeCheckTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = TypeCheckTool;
