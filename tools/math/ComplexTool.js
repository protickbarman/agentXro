const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class ComplexTool extends Tool {
  constructor() {
    super('complex', {
      description: 'Complex number operations: add, subtract, multiply, divide, conjugate, magnitude, argument',
      parameters: {
        type: 'object',
        properties: {
          re1: { type: 'number', description: 'Real part of first complex number' },
          im1: { type: 'number', description: 'Imaginary part of first complex number' },
          op: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide', 'conjugate', 'magnitude', 'argument'], description: 'Operation' },
          re2: { type: 'number', description: 'Real part of second complex number' },
          im2: { type: 'number', description: 'Imaginary part of second complex number' },
        },
        required: ['re1', 'im1', 'op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (typeof params.re1 !== 'number' || typeof params.im1 !== 'number') {
      throw new Error('re1 and im1 must be numbers');
    }
    if (!['add', 'subtract', 'multiply', 'divide', 'conjugate', 'magnitude', 'argument'].includes(params.op)) {
      throw new Error('Invalid operation');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { re1, im1, op, re2 = 0, im2 = 0 } = params;

      let real, imag;

      switch (op) {
        case 'add':
          real = re1 + re2;
          imag = im1 + im2;
          break;
        case 'subtract':
          real = re1 - re2;
          imag = im1 - im2;
          break;
        case 'multiply':
          real = re1 * re2 - im1 * im2;
          imag = re1 * im2 + im1 * re2;
          break;
        case 'divide': {
          const denom = re2 * re2 + im2 * im2;
          if (denom === 0) throw new Error('Division by zero');
          real = (re1 * re2 + im1 * im2) / denom;
          imag = (im1 * re2 - re1 * im2) / denom;
          break;
        }
        case 'conjugate':
          real = re1;
          imag = -im1;
          break;
        case 'magnitude':
          return { op, result: Math.sqrt(re1 * re1 + im1 * im1) };
        case 'argument':
          return { op, result: Math.atan2(im1, re1) };
        default:
          throw new Error(`Unknown operation: ${op}`);
      }

      return { op, result: { real: Math.round(real * 1e15) / 1e15, imag: Math.round(imag * 1e15) / 1e15 } };
    } catch (error) {
      logger.error(`Complex execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ComplexTool;
