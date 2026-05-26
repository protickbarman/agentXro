const Tool = require('../base/Tool');
const crypto = require('crypto');
const logger = require('../../config/logger');

const CHARSETS = {
  alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  numeric: '0123456789',
  hex: '0123456789abcdef',
  base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
};

class RandomStringTool extends Tool {
  constructor() {
    super('random_string', {
      description: 'Generate cryptographically random string',
      parameters: {
        type: 'object',
        properties: {
          length: { type: 'number', description: 'String length' },
          charset: { type: 'string', enum: ['alpha', 'alphanumeric', 'numeric', 'hex', 'base64', 'custom'], description: 'Character set' },
          customChars: { type: 'string', description: 'Custom characters (when charset=custom)' },
        },
        required: ['length'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.length || params.length < 1) throw new Error('length required and must be > 0');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { length, charset = 'alphanumeric', customChars } = params;
      let alphabet = CHARSETS[charset];
      if (charset === 'custom') {
        if (!customChars) throw new Error('customChars required when charset=custom');
        alphabet = customChars;
      }
      if (!alphabet) throw new Error(`Unknown charset: ${charset}`);

      const bytes = crypto.randomBytes(length);
      let result = '';
      for (let i = 0; i < length; i++) {
        result += alphabet[bytes[i] % alphabet.length];
      }
      return { length, charset, result };
    } catch (e) {
      logger.error(`RandomStringTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = RandomStringTool;
