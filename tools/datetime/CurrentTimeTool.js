const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class CurrentTimeTool extends Tool {
  constructor() {
    super('current_time', {
      description: 'Get the current date and time in various formats',
      parameters: {
        type: 'object',
        properties: {
          timezone: { type: 'string', description: 'Timezone offset like "UTC+5" or "UTC-8" (default: local)' },
          format: { type: 'string', enum: ['iso', 'unix', 'date', 'time', 'datetime', 'rfc2822'], description: 'Output format (default: datetime)' },
        },
        required: [],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.format && !['iso', 'unix', 'date', 'time', 'datetime', 'rfc2822'].includes(params.format)) {
      throw new Error('Invalid format. Must be one of: iso, unix, date, time, datetime, rfc2822');
    }
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
      const fmt = params.format || 'datetime';
      const now = this.applyTimezone(new Date(), params.timezone);

      const pad = (n) => String(n).padStart(2, '0');
      const y = now.getFullYear();
      const M = pad(now.getMonth() + 1);
      const d = pad(now.getDate());
      const h = pad(now.getHours());
      const m = pad(now.getMinutes());
      const s = pad(now.getSeconds());

      let result;
      switch (fmt) {
        case 'iso':
          result = now.toISOString();
          break;
        case 'unix':
          result = Math.floor(now.getTime() / 1000);
          break;
        case 'date':
          result = `${y}-${M}-${d}`;
          break;
        case 'time':
          result = `${h}:${m}:${s}`;
          break;
        case 'datetime':
          result = `${y}-${M}-${d} ${h}:${m}:${s}`;
          break;
        case 'rfc2822':
          result = now.toUTCString();
          break;
        default:
          result = `${y}-${M}-${d} ${h}:${m}:${s}`;
      }

      return { format: fmt, timezone: params.timezone || 'local', value: result };
    } catch (error) {
      logger.error(`CurrentTime execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = CurrentTimeTool;
