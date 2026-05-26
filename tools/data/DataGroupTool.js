const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class DataGroupTool extends Tool {
  constructor() {
    super('data_group', {
      description: 'Group array of objects by a key with optional aggregation',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'array', description: 'Array of objects to group' },
          key: { type: 'string', description: 'Key to group by' },
          aggregate: { type: 'string', enum: ['count', 'sum', 'avg', 'min', 'max'], description: 'Aggregation function' },
          aggregateField: { type: 'string', description: 'Field to aggregate' },
        },
        required: ['data', 'key'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.data || !Array.isArray(params.data)) throw new Error('data array required');
    if (!params.key) throw new Error('key required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { data, key, aggregate, aggregateField } = params;
      const groups = {};

      for (const item of data) {
        const groupKey = item[key];
        if (!groups[groupKey]) {
          groups[groupKey] = { key: groupKey, items: [] };
        }
        groups[groupKey].items.push(item);
      }

      let result;
      if (aggregate && aggregateField) {
        result = Object.values(groups).map(group => {
          const values = group.items.map(i => Number(i[aggregateField])).filter(v => !isNaN(v));
          let value;
          switch (aggregate) {
            case 'count': value = group.items.length; break;
            case 'sum': value = values.reduce((a, b) => a + b, 0); break;
            case 'avg': value = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; break;
            case 'min': value = values.length ? Math.min(...values) : 0; break;
            case 'max': value = values.length ? Math.max(...values) : 0; break;
            default: value = null;
          }
          return { key: group.key, count: group.items.length, [aggregate]: value };
        });
      } else {
        result = Object.values(groups).map(group => ({
          key: group.key,
          count: group.items.length,
          items: group.items,
        }));
      }

      return { groups: result };
    } catch (e) {
      logger.error('DataGroupTool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = DataGroupTool;
