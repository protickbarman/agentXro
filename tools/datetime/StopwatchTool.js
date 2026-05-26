const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const timers = new Map();

class StopwatchTool extends Tool {
  constructor() {
    super('stopwatch', {
      description: 'In-memory stopwatch timer with start, stop, elapsed, and reset actions',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['start', 'stop', 'elapsed', 'reset'], description: 'Action to perform' },
          id: { type: 'string', description: 'Timer identifier' },
        },
        required: ['action', 'id'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.action) throw new Error('Action is required');
    if (!['start', 'stop', 'elapsed', 'reset'].includes(params.action)) {
      throw new Error('Action must be one of: start, stop, elapsed, reset');
    }
    if (!params.id) throw new Error('id is required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { action, id } = params;
      const now = Date.now();

      switch (action) {
        case 'start': {
          if (timers.has(id)) {
            return { action, id, message: `Timer "${id}" already exists. Resetting.`, elapsed: 0 };
          }
          timers.set(id, now);
          return { action, id, elapsed: 0 };
        }
        case 'stop': {
          if (!timers.has(id)) {
            throw new Error(`Timer "${id}" not found. Call start first.`);
          }
          const startTime = timers.get(id);
          timers.delete(id);
          return { action, id, elapsed: now - startTime };
        }
        case 'elapsed': {
          if (!timers.has(id)) {
            throw new Error(`Timer "${id}" not found. Call start first.`);
          }
          return { action, id, elapsed: now - timers.get(id) };
        }
        case 'reset': {
          timers.set(id, now);
          return { action, id, elapsed: 0 };
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error(`Stopwatch execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = StopwatchTool;
