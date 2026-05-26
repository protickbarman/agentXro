const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class CombinatoricsTool extends Tool {
  constructor() {
    super('combinatorics', {
      description: 'Compute combinatorial values: factorial, permutations nPr, combinations nCr',
      parameters: {
        type: 'object',
        properties: {
          n: { type: 'number', description: 'Total items' },
          k: { type: 'number', description: 'Items to choose' },
          op: { type: 'string', enum: ['factorial', 'permutation', 'combination'], description: 'Operation' },
        },
        required: ['n', 'op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (typeof params.n !== 'number' || !Number.isInteger(params.n) || params.n < 0) {
      throw new Error('n must be a non-negative integer');
    }
    if (!['factorial', 'permutation', 'combination'].includes(params.op)) {
      throw new Error('op must be "factorial", "permutation", or "combination"');
    }
    return true;
  }

  factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { n, op } = params;

      switch (op) {
        case 'factorial':
          return { op, n, result: this.factorial(n) };
        case 'permutation': {
          if (params.k === undefined || !Number.isInteger(params.k) || params.k < 0) {
            throw new Error('k must be a non-negative integer');
          }
          if (params.k > n) throw new Error('k cannot exceed n');
          const result = this.factorial(n) / this.factorial(n - params.k);
          return { op, n, k: params.k, result };
        }
        case 'combination': {
          if (params.k === undefined || !Number.isInteger(params.k) || params.k < 0) {
            throw new Error('k must be a non-negative integer');
          }
          if (params.k > n) throw new Error('k cannot exceed n');
          const result = this.factorial(n) / (this.factorial(params.k) * this.factorial(n - params.k));
          return { op, n, k: params.k, result };
        }
        default:
          throw new Error(`Unknown operation: ${op}`);
      }
    } catch (error) {
      logger.error(`Combinatorics execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = CombinatoricsTool;
