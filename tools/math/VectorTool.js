const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class VectorTool extends Tool {
  constructor() {
    super('vector', {
      description: 'Vector operations: add, subtract, dot_product, cross_product, magnitude, normalize',
      parameters: {
        type: 'object',
        properties: {
          a: { type: 'array', items: { type: 'number' }, description: 'First vector' },
          b: { type: 'array', items: { type: 'number' }, description: 'Second vector (for binary ops)' },
          op: { type: 'string', enum: ['add', 'subtract', 'dot_product', 'cross_product', 'magnitude', 'normalize'], description: 'Vector operation' },
        },
        required: ['a', 'op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!Array.isArray(params.a) || params.a.length === 0) {
      throw new Error('a must be a non-empty array');
    }
    if (!params.a.every(v => typeof v === 'number' && isFinite(v))) {
      throw new Error('All vector elements must be finite numbers');
    }
    if (!['add', 'subtract', 'dot_product', 'cross_product', 'magnitude', 'normalize'].includes(params.op)) {
      throw new Error('Invalid operation');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { a, b, op } = params;

      switch (op) {
        case 'add': {
          if (!b || a.length !== b.length) throw new Error('Vectors must have same length');
          const result = a.map((v, i) => v + b[i]);
          return { op, result };
        }
        case 'subtract': {
          if (!b || a.length !== b.length) throw new Error('Vectors must have same length');
          const result = a.map((v, i) => v - b[i]);
          return { op, result };
        }
        case 'dot_product': {
          if (!b || a.length !== b.length) throw new Error('Vectors must have same length');
          const result = a.reduce((s, v, i) => s + v * b[i], 0);
          return { op, result };
        }
        case 'cross_product': {
          if (!b || a.length !== 3 || b.length !== 3) {
            throw new Error('Cross product requires 3D vectors');
          }
          const result = [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0],
          ];
          return { op, result };
        }
        case 'magnitude': {
          const result = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
          return { op, result };
        }
        case 'normalize': {
          const mag = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
          if (mag === 0) throw new Error('Cannot normalize a zero vector');
          const result = a.map(v => v / mag);
          return { op, result };
        }
        default:
          throw new Error(`Unknown operation: ${op}`);
      }
    } catch (error) {
      logger.error(`Vector execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = VectorTool;
