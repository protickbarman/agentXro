const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class PercentageTool extends Tool {
  constructor() {
    super('percentage', {
      description: 'Percentage operations: percent_of, percent_change, percent_difference, value_from_percent',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Numeric value' },
          total: { type: 'number', description: 'Total for percent_of calculation' },
          percent: { type: 'number', description: 'Percentage value' },
          op: { type: 'string', enum: ['percent_of', 'percent_change', 'percent_difference', 'value_from_percent'], description: 'Operation' },
        },
        required: ['value', 'op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (typeof params.value !== 'number' || !isFinite(params.value)) {
      throw new Error('value must be a finite number');
    }
    if (!['percent_of', 'percent_change', 'percent_difference', 'value_from_percent'].includes(params.op)) {
      throw new Error('Invalid operation');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, total, percent, op } = params;

      switch (op) {
        case 'percent_of':
          if (total === undefined) throw new Error('total required for percent_of');
          return { op, value, total, result: (value / total) * 100 };
        case 'percent_change':
          if (total === undefined) throw new Error('total required for percent_change');
          return { op, from: total, to: value, result: ((value - total) / Math.abs(total)) * 100 };
        case 'percent_difference':
          if (total === undefined) throw new Error('total required for percent_difference');
          return { op, a: value, b: total, result: (Math.abs(value - total) / ((value + total) / 2)) * 100 };
        case 'value_from_percent':
          if (percent === undefined) throw new Error('percent required for value_from_percent');
          return { op, percent, total: value, result: (percent / 100) * value };
        default:
          throw new Error(`Unknown operation: ${op}`);
      }
    } catch (error) {
      logger.error(`Percentage execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PercentageTool;
