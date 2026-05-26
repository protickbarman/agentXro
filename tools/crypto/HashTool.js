const Tool = require('../base/Tool');
const crypto = require('crypto');
const logger = require('../../config/logger');

class HashTool extends Tool {
  constructor() {
    super('hash', {
      description: 'Hash values using MD5, SHA-1, SHA-256, SHA-384, SHA-512',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'Value to hash' },
          algorithm: { type: 'string', enum: ['md5', 'sha1', 'sha256', 'sha384', 'sha512'], description: 'Hash algorithm' },
          encoding: { type: 'string', enum: ['hex', 'base64'], description: 'Output encoding' },
        },
        required: ['value'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.value && params.value !== '') throw new Error('value required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, algorithm = 'sha256', encoding = 'hex' } = params;
      const algoMap = { md5: 'md5', sha1: 'sha1', sha256: 'sha256', sha384: 'sha384', sha512: 'sha512' };
      const algo = algoMap[algorithm];
      if (!algo) throw new Error(`Unknown algorithm: ${algorithm}`);
      const hash = crypto.createHash(algo).update(String(value)).digest(encoding);
      return { value, algorithm, encoding, hash };
    } catch (e) {
      logger.error(`HashTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = HashTool;
