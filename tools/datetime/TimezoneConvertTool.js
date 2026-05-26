const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class TimezoneConvertTool extends Tool {
  constructor() {
    super('timezone_convert', {
      description: 'Convert a date between timezones using offset-based conversion',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date string to convert' },
          fromOffset: { type: 'number', description: 'Source timezone offset in hours from UTC (e.g., 5 for UTC+5)' },
          toOffset: { type: 'number', description: 'Target timezone offset in hours from UTC' },
          fromTz: { type: 'string', description: 'Source timezone string like "UTC+5"' },
          toTz: { type: 'string', description: 'Target timezone string like "UTC+3"' },
        },
        required: ['date'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.date) throw new Error('Date is required');
    if (params.fromOffset === undefined && !params.fromTz) throw new Error('fromOffset or fromTz is required');
    if (params.toOffset === undefined && !params.toTz) throw new Error('toOffset or toTz is required');
    return true;
  }

  parseOffset(tz) {
    const match = tz.match(/^UTC([+-])(\d+)(?::(\d{2}))?$/i);
    if (!match) return null;
    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const minutes = match[3] ? parseInt(match[3], 10) : 0;
    return sign * (hours + minutes / 60);
  }

  async execute(params) {
    try {
      this.validate(params);
      const date = new Date(params.date);
      if (isNaN(date.getTime())) throw new Error(`Could not parse date: "${params.date}"`);

      const fromOffset = params.fromOffset !== undefined ? params.fromOffset : this.parseOffset(params.fromTz);
      const toOffset = params.toOffset !== undefined ? params.toOffset : this.parseOffset(params.toTz);

      if (fromOffset === null) throw new Error(`Could not parse fromOffset: "${params.fromTz}"`);
      if (toOffset === null) throw new Error(`Could not parse toOffset: "${params.toTz}"`);

      const utcMs = date.getTime() - fromOffset * 3600000;
      const converted = new Date(utcMs + toOffset * 3600000);

      return {
        input: params.date,
        fromOffset,
        toOffset,
        result: converted.toISOString(),
        unix: Math.floor(converted.getTime() / 1000),
      };
    } catch (error) {
      logger.error(`TimezoneConvert execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = TimezoneConvertTool;
