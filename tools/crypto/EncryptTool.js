const Tool = require('../base/Tool');
const crypto = require('crypto');
const logger = require('../../config/logger');

class EncryptTool extends Tool {
  constructor() {
    super('encrypt', {
      description: 'AES-256-CBC encrypt',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'Value to encrypt' },
          key: { type: 'string', description: 'Encryption key' },
          algorithm: { type: 'string', description: 'Encryption algorithm (default aes-256-cbc)' },
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
      const { value, key, algorithm = 'aes-256-cbc' } = params;
      const derivedKey = crypto.scryptSync(key, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, derivedKey, iv);
      let encrypted = cipher.update(String(value), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return { value, algorithm, iv: iv.toString('hex'), encrypted };
    } catch (e) {
      logger.error(`EncryptTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = EncryptTool;
