const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class DateSubtractTool extends Tool {
  constructor() {
    super('date_subtract', {
      description: 'Subtract a duration from a date',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date string to subtract from' },
          amount: { type: 'number', description: 'Amount to subtract' },
          unit: { type: 'string', enum: ['years', 'months', 'days', 'hours', 'minutes', 'seconds'], description: 'Unit of time' },
        },
        required: ['date', 'amount', 'unit'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.date) throw new Error('Date is required');
    if (params.amount === undefined || params.amount === null) throw new Error('Amount is required');
    if (typeof params.amount !== 'number') throw new Error('Amount must be a number');
    if (!['years', 'months', 'days', 'hours', 'minutes', 'seconds'].includes(params.unit)) {
      throw new Error('Unit must be one of: years, months, days, hours, minutes, seconds');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const date = new Date(params.date);
      if (isNaN(date.getTime())) throw new Error(`Could not parse date: "${params.date}"`);

      const { amount, unit } = params;

      switch (unit) {
        case 'years':
          date.setFullYear(date.getFullYear() - amount);
          break;
        case 'months':
          date.setMonth(date.getMonth() - amount);
          break;
        case 'days':
          date.setDate(date.getDate() - amount);
          break;
        case 'hours':
          date.setHours(date.getHours() - amount);
          break;
        case 'minutes':
          date.setMinutes(date.getMinutes() - amount);
          break;
        case 'seconds':
          date.setSeconds(date.getSeconds() - amount);
          break;
      }

      return {
        input: params.date,
        amount,
        unit,
        result: date.toISOString(),
        unix: Math.floor(date.getTime() / 1000),
      };
    } catch (error) {
      logger.error(`DateSubtract execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = DateSubtractTool;
