const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class SetTheoryTool extends Tool {
  constructor() {
    super('set_theory', {
      description: 'Set operations: union, intersection, difference, symmetric_difference, subset_check',
      parameters: {
        type: 'object',
        properties: {
          a: { type: 'array', description: 'First set (array)' },
          b: { type: 'array', description: 'Second set (array)' },
          op: { type: 'string', enum: ['union', 'intersection', 'difference', 'symmetric_difference', 'subset_check'], description: 'Set operation' },
        },
        required: ['a', 'b', 'op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!Array.isArray(params.a) || !Array.isArray(params.b)) {
      throw new Error('a and b must be arrays');
    }
    if (!['union', 'intersection', 'difference', 'symmetric_difference', 'subset_check'].includes(params.op)) {
      throw new Error('Invalid operation');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { a, b, op } = params;
      const setA = new Set(a);
      const setB = new Set(b);

      switch (op) {
        case 'union': {
          const result = [...new Set([...a, ...b])];
          return { op, result };
        }
        case 'intersection': {
          const result = [...a.filter(x => setB.has(x))];
          return { op, result };
        }
        case 'difference': {
          const result = [...a.filter(x => !setB.has(x))];
          return { op, result };
        }
        case 'symmetric_difference': {
          const inANotB = a.filter(x => !setB.has(x));
          const inBNotA = b.filter(x => !setA.has(x));
          return { op, result: [...inANotB, ...inBNotA] };
        }
        case 'subset_check': {
          const isSubset = a.every(x => setB.has(x));
          return { op, a_has_b: isSubset, b_has_a: b.every(x => setA.has(x)) };
        }
        default:
          throw new Error(`Unknown operation: ${op}`);
      }
    } catch (error) {
      logger.error(`SetTheory execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = SetTheoryTool;
