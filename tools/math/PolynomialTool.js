const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class PolynomialTool extends Tool {
  constructor() {
    super('polynomial', {
      description: 'Polynomial operations: evaluate, add, multiply, differentiate',
      parameters: {
        type: 'object',
        properties: {
          coeffs: { type: 'array', items: { type: 'number' }, description: 'Coefficients [c0, c1, c2, ...] for c0 + c1*x + c2*x^2 + ...' },
          x: { type: 'number', description: 'X value for evaluation' },
          op: { type: 'string', enum: ['evaluate', 'add', 'multiply', 'differentiate'], description: 'Polynomial operation' },
        },
        required: ['coeffs', 'op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!Array.isArray(params.coeffs) || params.coeffs.length === 0) {
      throw new Error('coeffs must be a non-empty array');
    }
    if (!params.coeffs.every(v => typeof v === 'number' && isFinite(v))) {
      throw new Error('All coefficients must be finite numbers');
    }
    if (!['evaluate', 'add', 'multiply', 'differentiate'].includes(params.op)) {
      throw new Error('Invalid operation');
    }
    return true;
  }

  evaluate(coeffs, x) {
    return coeffs.reduce((result, c, i) => result + c * (x ** i), 0);
  }

  async execute(params) {
    try {
      this.validate(params);
      const { coeffs, op } = params;

      switch (op) {
        case 'evaluate': {
          if (params.x === undefined) throw new Error('x required for evaluate');
          const result = this.evaluate(coeffs, params.x);
          return { op, coeffs, x: params.x, result };
        }
        case 'add': {
          if (!params.x_coeffs) throw new Error('Provide second polynomial coeffs via x_coeffs');
          const b = params.x_coeffs;
          const maxLen = Math.max(coeffs.length, b.length);
          const result = Array.from({ length: maxLen }, (_, i) => (coeffs[i] || 0) + (b[i] || 0));
          return { op, result };
        }
        case 'multiply': {
          if (!params.x_coeffs) throw new Error('Provide second polynomial coeffs via x_coeffs');
          const b2 = params.x_coeffs;
          const result = new Array(coeffs.length + b2.length - 1).fill(0);
          for (let i = 0; i < coeffs.length; i++) {
            for (let j = 0; j < b2.length; j++) {
              result[i + j] += coeffs[i] * b2[j];
            }
          }
          return { op, result };
        }
        case 'differentiate': {
          const result = coeffs.slice(1).map((c, i) => c * (i + 1));
          return { op, original: coeffs, result };
        }
        default:
          throw new Error(`Unknown operation: ${op}`);
      }
    } catch (error) {
      logger.error(`Polynomial execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PolynomialTool;
