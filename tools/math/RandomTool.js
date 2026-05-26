const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class RandomTool extends Tool {
  constructor() {
    super('random', {
      description: 'Generate random numbers: integer, float, shuffle array, pick from array',
      parameters: {
        type: 'object',
        properties: {
          op: { type: 'string', enum: ['integer', 'float', 'shuffle', 'pick'], description: 'Random operation' },
          min: { type: 'number', description: 'Minimum value' },
          max: { type: 'number', description: 'Maximum value' },
          count: { type: 'number', description: 'Number of values (for integer/float)' },
        },
        required: ['op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!['integer', 'float', 'shuffle', 'pick'].includes(params.op)) {
      throw new Error('op must be "integer", "float", "shuffle", or "pick"');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { op, min = 0, max = 1, count = 1 } = params;

      switch (op) {
        case 'integer': {
          const intMin = Math.ceil(min);
          const intMax = Math.floor(max);
          const results = Array.from({ length: count }, () =>
            Math.floor(Math.random() * (intMax - intMin + 1)) + intMin
          );
          return { op, min: intMin, max: intMax, results };
        }
        case 'float': {
          const results = Array.from({ length: count }, () =>
            Math.random() * (max - min) + min
          );
          return { op, min, max, results };
        }
        case 'shuffle': {
          if (!Array.isArray(params._array)) {
            throw new Error('Provide an array via _array param or use differently');
          }
          const arr = [...params._array];
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return { op, result: arr };
        }
        case 'pick': {
          if (!Array.isArray(params._array)) {
            throw new Error('Provide an array via _array param or use differently');
          }
          const idx = Math.floor(Math.random() * params._array.length);
          return { op, result: params._array[idx] };
        }
        default:
          throw new Error(`Unknown operation: ${op}`);
      }
    } catch (error) {
      logger.error(`Random execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = RandomTool;
