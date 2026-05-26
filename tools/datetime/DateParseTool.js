const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class DateParseTool extends Tool {
  constructor() {
    super('date_parse', {
      description: 'Parse a date string into its components',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date string to parse' },
          format: { type: 'string', description: 'Expected format hint (optional)' },
        },
        required: ['date'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.date) {
      throw new Error('Date is required');
    }
    if (typeof params.date !== 'string') {
      throw new Error('Date must be a string');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const date = new Date(params.date);
      if (isNaN(date.getTime())) {
        throw new Error(`Could not parse date: "${params.date}"`);
      }

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds(),
        dayOfWeek: dayNames[date.getDay()],
        unix: Math.floor(date.getTime() / 1000),
        iso: date.toISOString(),
      };
    } catch (error) {
      logger.error(`DateParse execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = DateParseTool;
