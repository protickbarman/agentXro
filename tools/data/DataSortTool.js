const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class DataSortTool extends Tool {
  constructor() {
    super('data_sort', {
      description: 'Sort array of objects by one or more keys',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'array', description: 'Array of objects to sort' },
          keys: { type: 'array', items: { type: 'string' }, description: 'Keys to sort by' },
          order: { type: 'array', items: { type: 'string', enum: ['asc', 'desc'] }, description: 'Sort order per key (default asc)' },
        },
        required: ['data', 'keys'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.data || !Array.isArray(params.data)) throw new Error('data array required');
    if (!params.keys || !Array.isArray(params.keys)) throw new Error('keys array required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { data, keys, order = [] } = params;
      const sorted = [...data];
      sorted.sort((a, b) => {
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const dir = (order[i] || 'asc') === 'asc' ? 1 : -1;
          const valA = a[key];
          const valB = b[key];
          if (valA < valB) return -1 * dir;
          if (valA > valB) return 1 * dir;
        }
        return 0;
      });
      return { sorted, count: sorted.length };
    } catch (e) {
      logger.error('DataSortTool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = DataSortTool;
