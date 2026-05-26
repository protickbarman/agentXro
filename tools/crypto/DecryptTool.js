const Tool = require('../base/Tool');
const crypto = require('crypto');
const logger = require('../../config/logger');

class DecryptTool extends Tool {
  constructor() {
    super('decrypt', {
      description: 'AES-256-CBC decrypt',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'Hex-encoded encrypted value (iv:encrypted)' },
          key: { type: 'string', description: 'Decryption key' },
          algorithm: { type: 'string', description: 'Decryption algorithm (default aes-256-cbc)' },
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
      const parts = value.split(':');
      if (parts.length !== 2) throw new Error('value must be in format iv:encrypted');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const derivedKey = crypto.scryptSync(key, 'salt', 32);
      const decipher = crypto.createDecipheriv(algorithm, derivedKey, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return { value, algorithm, decrypted };
    } catch (e) {
      logger.error(`DecryptTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = DecryptTool;
