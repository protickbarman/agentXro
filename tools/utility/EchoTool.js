const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class EchoTool extends Tool {
  constructor() {
    super('echo', {
      description: 'Echo input params back for debugging',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Message to echo' },
          pretty: { type: 'boolean', description: 'Pretty-print output' },
        },
        required: ['message'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.message === undefined || params.message === null) throw new Error('message required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      return {
        message: params.message,
        pretty: params.pretty || false,
        receivedAt: new Date().toISOString(),
      };
    } catch (e) {
      logger.error(`EchoTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = EchoTool;
