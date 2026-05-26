const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class TimestampTool extends Tool {
  constructor() {
    super('timestamp', {
      description: 'Convert between Unix timestamps and dates, or get the current timestamp',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Unix timestamp (seconds) or date string depending on direction' },
          direction: { type: 'string', enum: ['to_date', 'to_unix'], description: 'Conversion direction (default: to_date if value provided)' },
        },
        required: [],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.direction && !['to_date', 'to_unix'].includes(params.direction)) {
      throw new Error('Direction must be "to_date" or "to_unix"');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);

      if (!params.direction && params.value === undefined) {
        return {
          unix: Math.floor(Date.now() / 1000),
          iso: new Date().toISOString(),
          direction: null,
        };
      }

      if (params.direction === 'to_unix' || (params.direction === undefined && !params.value)) {
        return {
          unix: Math.floor(Date.now() / 1000),
          iso: new Date().toISOString(),
          direction: 'current',
        };
      }

      if (params.direction === 'to_date' || (params.direction === undefined && typeof params.value === 'number')) {
        const date = new Date(params.value * 1000);
        if (isNaN(date.getTime())) throw new Error(`Invalid timestamp: ${params.value}`);
        return {
          unix: params.value,
          iso: date.toISOString(),
          local: date.toString(),
          direction: 'to_date',
        };
      }

      if (params.direction === 'to_unix') {
        const date = new Date(params.value);
        if (isNaN(date.getTime())) throw new Error(`Could not parse date: "${params.value}"`);
        return {
          input: params.value,
          unix: Math.floor(date.getTime() / 1000),
          iso: date.toISOString(),
          direction: 'to_unix',
        };
      }

      const date = new Date(params.value);
      if (isNaN(date.getTime())) throw new Error(`Could not parse value: "${params.value}"`);
      return {
        unix: Math.floor(date.getTime() / 1000),
        iso: date.toISOString(),
        direction: 'parsed',
      };
    } catch (error) {
      logger.error(`Timestamp execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = TimestampTool;
