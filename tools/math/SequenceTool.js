const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class SequenceTool extends Tool {
  constructor() {
    super('sequence', {
      description: 'Generate arithmetic, geometric, or Fibonacci sequences',
      parameters: {
        type: 'object',
        properties: {
          start: { type: 'number', description: 'Starting value (default: 0)' },
          diff: { type: 'number', description: 'Common difference (arithmetic)' },
          ratio: { type: 'number', description: 'Common ratio (geometric)' },
          count: { type: 'number', description: 'Number of terms' },
          type: { type: 'string', enum: ['arithmetic', 'geometric', 'fibonacci'], description: 'Sequence type' },
        },
        required: ['count', 'type'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (typeof params.count !== 'number' || !Number.isInteger(params.count) || params.count < 1) {
      throw new Error('count must be a positive integer');
    }
    if (!['arithmetic', 'geometric', 'fibonacci'].includes(params.type)) {
      throw new Error('type must be arithmetic, geometric, or fibonacci');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { type, count } = params;
      const start = params.start ?? 0;

      let sequence;
      switch (type) {
        case 'arithmetic': {
          const diff = params.diff ?? 1;
          sequence = Array.from({ length: count }, (_, i) => start + i * diff);
          break;
        }
        case 'geometric': {
          const ratio = params.ratio ?? 2;
          sequence = Array.from({ length: count }, (_, i) => start * (ratio ** i));
          break;
        }
        case 'fibonacci': {
          if (count === 1) { sequence = [0]; break; }
          sequence = [0, 1];
          for (let i = 2; i < count; i++) {
            sequence.push(sequence[i - 1] + sequence[i - 2]);
          }
          break;
        }
        default:
          throw new Error(`Unknown type: ${type}`);
      }

      return { type, count, start, sequence };
    } catch (error) {
      logger.error(`Sequence execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = SequenceTool;
