const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class DataFilterTool extends Tool {
  constructor() {
    super('data_filter', {
      description: 'Filter array of objects by field conditions',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'array', description: 'Array of objects to filter' },
          conditions: {
            type: 'string',
            description: 'JSON string of filter conditions: [{field, op, value}]',
          },
        },
        required: ['data', 'conditions'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.data || !Array.isArray(params.data)) throw new Error('data array required');
    if (!params.conditions) throw new Error('conditions required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const data = params.data;
      const conditions = typeof params.conditions === 'string' ? JSON.parse(params.conditions) : params.conditions;
      const filtered = data.filter(item => {
        return conditions.every(cond => {
          const { field, op, value } = cond;
          const fieldValue = item[field];
          switch (op) {
            case 'eq': return fieldValue === value;
            case 'neq': return fieldValue !== value;
            case 'gt': return fieldValue > value;
            case 'gte': return fieldValue >= value;
            case 'lt': return fieldValue < value;
            case 'lte': return fieldValue <= value;
            case 'contains': return String(fieldValue).includes(String(value));
            case 'startsWith': return String(fieldValue).startsWith(String(value));
            case 'endsWith': return String(fieldValue).endsWith(String(value));
            default: return true;
          }
        });
      });
      return { filtered, count: filtered.length, total: data.length };
    } catch (e) {
      logger.error('DataFilterTool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = DataFilterTool;
