const Tool = require('../base/Tool');
const logger = require('../../config/logger');

/**
 * Timer Tool
 * Measures time elapsed for operations
 */
class TimerTool extends Tool {
  constructor() {
    super('timer', {
      description: 'Measures time elapsed between operations',
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            description: 'Operation name or action to time',
            enum: ['start', 'end', 'elapsed'],
          },
          timerId: {
            type: 'string',
            description: 'Unique identifier for the timer',
          },
        },
        required: ['operation', 'timerId'],
      },
    });
    this.timers = new Map();
    this.timeout = 2000;
  }

  /**
   * Validate input
   */
  validate(params) {
    if (!params.operation) {
      throw new Error('Operation is required');
    }
    if (!params.timerId) {
      throw new Error('Timer ID is required');
    }
    if (!['start', 'end', 'elapsed'].includes(params.operation)) {
      throw new Error('Invalid operation');
    }
    return true;
  }

  /**
   * Execute timer operation
   */
  async execute(params) {
    try {
      this.validate(params);

      const { operation, timerId } = params;

      logger.debug(`Timer ${operation}: ${timerId}`);

      if (operation === 'start') {
        this.timers.set(timerId, Date.now());
        return {
          operation: 'started',
          timerId,
          timestamp: new Date().toISOString(),
        };
      } else if (operation === 'end') {
        const startTime = this.timers.get(timerId);
        if (!startTime) {
          throw new Error(`Timer ${timerId} not started`);
        }

        const elapsed = Date.now() - startTime;
        this.timers.delete(timerId);

        return {
          operation: 'ended',
          timerId,
          elapsedMs: elapsed,
          elapsedSeconds: (elapsed / 1000).toFixed(3),
        };
      } else if (operation === 'elapsed') {
        const startTime = this.timers.get(timerId);
        if (!startTime) {
          throw new Error(`Timer ${timerId} not started`);
        }

        const elapsed = Date.now() - startTime;

        return {
          operation: 'elapsed',
          timerId,
          elapsedMs: elapsed,
          elapsedSeconds: (elapsed / 1000).toFixed(3),
          isRunning: true,
        };
      }
    } catch (error) {
      logger.error(`Timer operation failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = TimerTool;
