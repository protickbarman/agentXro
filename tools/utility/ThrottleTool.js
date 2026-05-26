const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class ThrottleTool extends Tool {
  constructor() {
    super('throttle', {
      description: 'Rate limit simulation (delay)',
      parameters: {
        type: 'object',
        properties: {
          ms: { type: 'number', description: 'Delay in milliseconds' },
        },
        required: ['ms'],
      },
    });
    this.timeout = 30000;
  }

  validate(params) {
    if (params.ms === undefined || params.ms === null) throw new Error('ms required');
    if (typeof params.ms !== 'number' || params.ms < 0) throw new Error('ms must be a non-negative number');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const start = Date.now();
      await new Promise(resolve => setTimeout(resolve, params.ms));
      const elapsed = Date.now() - start;
      return { delayed: true, ms: params.ms, elapsed };
    } catch (e) {
      logger.error(`ThrottleTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = ThrottleTool;
