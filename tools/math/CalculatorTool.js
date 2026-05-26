const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class CalculatorTool extends Tool {
  constructor() {
    super('calculator', {
      description: 'Performs mathematical calculations and arithmetic operations',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate (e.g., "2+2", "sqrt(16)", "10*5")',
          },
        },
        required: ['expression'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.expression) {
      throw new Error('Expression is required');
    }
    if (typeof params.expression !== 'string') {
      throw new Error('Expression must be a string');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);

      const { expression } = params;

      const safeExpression = expression
        .replace(/[^0-9+\-*/().sqrt()]/g, '')
        .trim();

      if (!safeExpression) {
        throw new Error('Invalid expression');
      }

      logger.debug(`Calculator executing: ${safeExpression}`);

      const result = Function('"use strict"; return (' + safeExpression + ')')();

      if (typeof result !== 'number') {
        throw new Error('Expression did not return a number');
      }

      if (!isFinite(result)) {
        throw new Error('Calculation resulted in infinity or NaN');
      }

      return {
        expression: safeExpression,
        result,
        formatted: result.toFixed(10).replace(/\.?0+$/, ''),
      };
    } catch (error) {
      logger.error(`Calculator execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = CalculatorTool;
