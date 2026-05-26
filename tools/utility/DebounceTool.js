const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const timestamps = new Map();

class DebounceTool extends Tool {
  constructor() {
    super('debounce', {
      description: 'Collect calls within window, return remaining wait time',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['ping', 'status', 'reset'], description: 'Debounce action' },
          wait: { type: 'number', description: 'Wait window in ms' },
        },
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { action = 'ping', wait = 1000 } = params;

      switch (action) {
        case 'ping': {
          const now = Date.now();
          const last = timestamps.get('last') || 0;
          const elapsed = now - last;
          timestamps.set('last', now);
          const remaining = Math.max(0, wait - elapsed);
          return { action, lastCall: last, remaining, ready: remaining <= 0 };
        }
        case 'status': {
          const last = timestamps.get('last') || 0;
          const elapsed = Date.now() - last;
          const remaining = Math.max(0, wait - elapsed);
          return { action, lastCall: last, remaining, ready: remaining <= 0 };
        }
        case 'reset': {
          timestamps.delete('last');
          return { action, lastCall: null, remaining: 0, ready: true };
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (e) {
      logger.error(`DebounceTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = DebounceTool;
