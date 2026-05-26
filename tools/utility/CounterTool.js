const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const counters = new Map();

class CounterTool extends Tool {
  constructor() {
    super('counter', {
      description: 'In-memory counter with get, set, increment, decrement, reset operations',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Counter key' },
          op: { type: 'string', enum: ['get', 'set', 'inc', 'dec', 'reset'], description: 'Operation' },
          value: { type: 'number', description: 'Value for set operation' },
        },
        required: ['key', 'op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.key) throw new Error('key required');
    if (!params.op) throw new Error('op required');
    if (!['get', 'set', 'inc', 'dec', 'reset'].includes(params.op)) throw new Error('Invalid op');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { key, op, value } = params;

      switch (op) {
        case 'get':
          return { key, value: counters.get(key) || 0 };
        case 'set':
          counters.set(key, value || 0);
          return { key, value: counters.get(key) };
        case 'inc':
          counters.set(key, (counters.get(key) || 0) + 1);
          return { key, value: counters.get(key) };
        case 'dec':
          counters.set(key, (counters.get(key) || 0) - 1);
          return { key, value: counters.get(key) };
        case 'reset':
          counters.set(key, 0);
          return { key, value: 0 };
        default:
          throw new Error(`Unknown operation: ${op}`);
      }
    } catch (e) {
      logger.error(`CounterTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = CounterTool;
