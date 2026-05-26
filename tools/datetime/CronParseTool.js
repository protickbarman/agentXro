const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class CronParseTool extends Tool {
  constructor() {
    super('cron_parse', {
      description: 'Parse a 5-field cron expression and calculate next N run times',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Cron expression (5 fields: minute hour day month weekday)' },
          count: { type: 'number', description: 'Number of next run times to calculate (default: 5)' },
        },
        required: ['expression'],
      },
    });
    this.timeout = 10000;
  }

  validate(params) {
    if (!params.expression) throw new Error('Expression is required');
    const parts = params.expression.trim().split(/\s+/);
    if (parts.length !== 5) throw new Error('Cron expression must have exactly 5 fields');
    return true;
  }

  parseField(field, min, max) {
    if (field === '*') {
      const arr = [];
      for (let i = min; i <= max; i++) arr.push(i);
      return arr;
    }

    if (field.includes(',')) {
      const values = new Set();
      for (const part of field.split(',')) {
        const parsed = this.parseField(part, min, max);
        parsed.forEach(v => values.add(v));
      }
      return [...values].sort((a, b) => a - b);
    }

    if (field.includes('/')) {
      const [range, stepStr] = field.split('/');
      const step = parseInt(stepStr, 10);
      const rangeValues = this.parseField(range, min, max);
      const values = [];
      for (let i = 0; i < rangeValues.length; i += step) {
        values.push(rangeValues[i]);
      }
      return values;
    }

    if (field.includes('-')) {
      const [startStr, endStr] = field.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      const values = [];
      for (let i = start; i <= end; i++) values.push(i);
      return values;
    }

    return [parseInt(field, 10)];
  }

  async execute(params) {
    try {
      this.validate(params);
      const parts = params.expression.trim().split(/\s+/);
      const count = params.count || 5;

      const minuteVals = this.parseField(parts[0], 0, 59);
      const hourVals = this.parseField(parts[1], 0, 23);
      const dayVals = this.parseField(parts[2], 1, 31);
      const monthVals = this.parseField(parts[3], 1, 12);
      const weekdayVals = this.parseField(parts[4], 0, 6);

      const now = new Date();
      const nextRuns = [];

      for (let i = 0; nextRuns.length < count && i < 525600; i++) {
        const candidate = new Date(now.getTime() + i * 60000);
        const m = candidate.getMinutes();
        const h = candidate.getHours();
        const d = candidate.getDate();
        const mo = candidate.getMonth() + 1;
        const wd = candidate.getDay();

        if (!minuteVals.includes(m)) continue;
        if (!hourVals.includes(h)) continue;
        if (!dayVals.includes(d)) continue;
        if (!monthVals.includes(mo)) continue;
        if (!weekdayVals.includes(wd)) continue;

        nextRuns.push(candidate.toISOString());
      }

      return {
        expression: params.expression,
        parsed: {
          minute: minuteVals,
          hour: hourVals,
          day: dayVals,
          month: monthVals,
          weekday: weekdayVals,
        },
        nextRuns,
      };
    } catch (error) {
      logger.error(`CronParse execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = CronParseTool;
