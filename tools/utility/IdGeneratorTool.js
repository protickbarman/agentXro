const Tool = require('../base/Tool');
const crypto = require('crypto');
const logger = require('../../config/logger');

const DEFAULT_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const DEFAULT_LENGTH = 21;

class IdGeneratorTool extends Tool {
  constructor() {
    super('id_generator', {
      description: 'Generate short IDs (nanoid-style)',
      parameters: {
        type: 'object',
        properties: {
          length: { type: 'number', description: 'ID length' },
          prefix: { type: 'string', description: 'Optional prefix' },
          alphabet: { type: 'string', description: 'Custom alphabet' },
        },
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    return true;
  }

  _randomId(length, alphabet) {
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += alphabet[bytes[i] % alphabet.length];
    }
    return result;
  }

  async execute(params) {
    try {
      this.validate(params);
      const length = params.length || DEFAULT_LENGTH;
      const alphabet = params.alphabet || DEFAULT_ALPHABET;
      const prefix = params.prefix || '';
      const id = this._randomId(length, alphabet);
      return { id: prefix + id, length, prefix: prefix || null, alphabetSize: alphabet.length };
    } catch (e) {
      logger.error(`IdGeneratorTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = IdGeneratorTool;
