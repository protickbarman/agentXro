const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class DateFormatTool extends Tool {
  constructor() {
    super('date_format', {
      description: 'Format a date using custom tokens: YYYY, MM, DD, HH, mm, ss',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date string to format' },
          format: { type: 'string', description: 'Format string using tokens YYYY, MM, DD, HH, mm, ss' },
          timezone: { type: 'string', description: 'Timezone offset like "UTC+5" or "UTC-8"' },
        },
        required: ['date', 'format'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.date) throw new Error('Date is required');
    if (!params.format) throw new Error('Format is required');
    return true;
  }

  applyTimezone(date, timezone) {
    if (!timezone) return date;
    const match = timezone.match(/^UTC([+-])(\d+)(?::(\d{2}))?$/i);
    if (!match) return date;
    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const minutes = match[3] ? parseInt(match[3], 10) : 0;
    const offset = sign * (hours * 60 + minutes);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000 + offset * 60000);
  }

  async execute(params) {
    try {
      this.validate(params);
      const date = this.applyTimezone(new Date(params.date), params.timezone);
      if (isNaN(date.getTime())) {
        throw new Error(`Could not parse date: "${params.date}"`);
      }

      const pad = (n) => String(n).padStart(2, '0');
      const tokens = {
        YYYY: String(date.getFullYear()),
        MM: pad(date.getMonth() + 1),
        DD: pad(date.getDate()),
        HH: pad(date.getHours()),
        mm: pad(date.getMinutes()),
        ss: pad(date.getSeconds()),
      };

      let result = params.format;
      for (const [token, value] of Object.entries(tokens)) {
        result = result.replace(token, value);
      }

      return { input: params.date, format: params.format, result };
    } catch (error) {
      logger.error(`DateFormat execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = DateFormatTool;
