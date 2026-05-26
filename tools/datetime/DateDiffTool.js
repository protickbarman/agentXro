const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class DateDiffTool extends Tool {
  constructor() {
    super('date_diff', {
      description: 'Calculate the difference between two dates',
      parameters: {
        type: 'object',
        properties: {
          start: { type: 'string', description: 'Start date string' },
          end: { type: 'string', description: 'End date string' },
          unit: { type: 'string', enum: ['milliseconds', 'seconds', 'minutes', 'hours', 'days', 'months', 'years'], description: 'Unit for the result (optional)' },
        },
        required: ['start', 'end'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.start) throw new Error('Start date is required');
    if (!params.end) throw new Error('End date is required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const start = new Date(params.start);
      const end = new Date(params.end);

      if (isNaN(start.getTime())) throw new Error(`Could not parse start date: "${params.start}"`);
      if (isNaN(end.getTime())) throw new Error(`Could not parse end date: "${params.end}"`);

      const diffMs = end.getTime() - start.getTime();
      const absMs = Math.abs(diffMs);

      const result = {
        milliseconds: diffMs,
        seconds: Math.floor(absMs / 1000) * Math.sign(diffMs),
        minutes: Math.floor(absMs / 60000) * Math.sign(diffMs),
        hours: Math.floor(absMs / 3600000) * Math.sign(diffMs),
        days: Math.floor(absMs / 86400000) * Math.sign(diffMs),
        months: Math.floor(absMs / 2592000000) * Math.sign(diffMs),
        years: Math.floor(absMs / 31536000000) * Math.sign(diffMs),
      };

      if (params.unit) {
        return { start: params.start, end: params.end, unit: params.unit, value: result[params.unit], ...result };
      }

      return { start: params.start, end: params.end, ...result };
    } catch (error) {
      logger.error(`DateDiff execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = DateDiffTool;
