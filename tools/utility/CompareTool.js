const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class CompareTool extends Tool {
  constructor() {
    super('compare', {
      description: 'Compare values by type',
      parameters: {
        type: 'object',
        properties: {
          a: { type: 'string', description: 'First value' },
          b: { type: 'string', description: 'Second value' },
          type: { type: 'string', enum: ['auto', 'string', 'number', 'date', 'version'], description: 'Comparison type' },
          op: { type: 'string', enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains'], description: 'Comparison operator' },
        },
        required: ['a', 'b'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.a === undefined || params.b === undefined) throw new Error('a and b required');
    return true;
  }

  _compare(a, b, type) {
    let va = a;
    let vb = b;

    if (type === 'number' || type === 'auto') {
      const na = Number(a);
      const nb = Number(b);
      if (!isNaN(na) && !isNaN(nb)) {
        va = na;
        vb = nb;
      }
    }

    if (type === 'date' || (type === 'auto' && !isNaN(Date.parse(a)) && !isNaN(Date.parse(b)))) {
      va = new Date(a).getTime();
      vb = new Date(b).getTime();
    }

    if (type === 'string' || type === 'auto') {
      va = String(a);
      vb = String(b);
    }

    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { a, b, type = 'auto', op = 'eq' } = params;
      const cmp = this._compare(a, b, type);
      let result;

      switch (op) {
        case 'eq': result = cmp === 0; break;
        case 'neq': result = cmp !== 0; break;
        case 'gt': result = cmp > 0; break;
        case 'gte': result = cmp >= 0; break;
        case 'lt': result = cmp < 0; break;
        case 'lte': result = cmp <= 0; break;
        case 'contains': result = String(a).includes(String(b)); break;
        default: throw new Error(`Unknown operator: ${op}`);
      }

      return { a, b, type, op, result, comparison: cmp };
    } catch (e) {
      logger.error(`CompareTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = CompareTool;
