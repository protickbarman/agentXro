const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class SleepTool extends Tool {
  constructor() {
    super('sleep', {
      description: 'Delay execution for a specified number of milliseconds',
      parameters: {
        type: 'object',
        properties: {
          ms: { type: 'number', description: 'Number of milliseconds to sleep' },
        },
        required: ['ms'],
      },
    });
    this.timeout = 300000;
  }

  validate(params) {
    if (params.ms === undefined || params.ms === null) throw new Error('ms is required');
    if (typeof params.ms !== 'number' || !isFinite(params.ms)) throw new Error('ms must be a finite number');
    if (params.ms < 0) throw new Error('ms must be a non-negative number');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const start = Date.now();
      await new Promise(resolve => setTimeout(resolve, params.ms));
      return {
        ms: params.ms,
        elapsed: Date.now() - start,
      };
    } catch (error) {
      logger.error(`Sleep execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = SleepTool;
