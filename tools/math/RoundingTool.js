const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class RoundingTool extends Tool {
  constructor() {
    super('rounding', {
      description: 'Rounding operations: round, floor, ceil, significant_digits',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Number to round' },
          precision: { type: 'number', description: 'Number of decimal places or significant digits' },
          mode: { type: 'string', enum: ['round', 'floor', 'ceil', 'significant_digits'], description: 'Rounding mode' },
        },
        required: ['value', 'precision', 'mode'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (typeof params.value !== 'number' || !isFinite(params.value)) {
      throw new Error('value must be a finite number');
    }
    if (typeof params.precision !== 'number' || !Number.isInteger(params.precision) || params.precision < 0) {
      throw new Error('precision must be a non-negative integer');
    }
    if (!['round', 'floor', 'ceil', 'significant_digits'].includes(params.mode)) {
      throw new Error('mode must be round, floor, ceil, or significant_digits');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, precision, mode } = params;

      let result;
      switch (mode) {
        case 'round': {
          const factor = 10 ** precision;
          result = Math.round(value * factor) / factor;
          break;
        }
        case 'floor': {
          const factor = 10 ** precision;
          result = Math.floor(value * factor) / factor;
          break;
        }
        case 'ceil': {
          const factor = 10 ** precision;
          result = Math.ceil(value * factor) / factor;
          break;
        }
        case 'significant_digits': {
          if (value === 0) { result = 0; break; }
          const d = Math.ceil(Math.log10(Math.abs(value)));
          const factor = 10 ** (precision - d);
          result = Math.round(value * factor) / factor;
          break;
        }
        default:
          throw new Error(`Unknown mode: ${mode}`);
      }

      return { value, precision, mode, result };
    } catch (error) {
      logger.error(`Rounding execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = RoundingTool;
