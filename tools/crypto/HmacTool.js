const Tool = require('../base/Tool');
const crypto = require('crypto');
const logger = require('../../config/logger');

class HmacTool extends Tool {
  constructor() {
    super('hmac', {
      description: 'HMAC with key',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'Value to HMAC' },
          key: { type: 'string', description: 'Secret key' },
          algorithm: { type: 'string', description: 'Hash algorithm (default sha256)' },
          encoding: { type: 'string', description: 'Output encoding (default hex)' },
        },
        required: ['value', 'key'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.value && params.value !== '') throw new Error('value required');
    if (!params.key) throw new Error('key required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, key, algorithm = 'sha256', encoding = 'hex' } = params;
      const hmac = crypto.createHmac(algorithm, key).update(String(value)).digest(encoding);
      return { value, algorithm, encoding, hmac };
    } catch (e) {
      logger.error(`HmacTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = HmacTool;
