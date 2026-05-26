const Tool = require('../base/Tool');
const crypto = require('crypto');
const logger = require('../../config/logger');

class KeyPairTool extends Tool {
  constructor() {
    super('key_pair', {
      description: 'Generate RSA or ECDSA key pair',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['rsa', 'ecdsa'], description: 'Key type' },
          bits: { type: 'number', description: 'Key size in bits (RSA) or curve (ECDSA)' },
        },
      },
    });
    this.timeout = 30000;
  }

  validate(params) {
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { type = 'rsa', bits = 2048 } = params;

      let options;
      if (type === 'rsa') {
        options = {
          modulusLength: bits,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        };
      } else {
        const curves = { 256: 'prime256v1', 384: 'secp384r1', 521: 'secp521r1' };
        const namedCurve = curves[bits] || 'prime256v1';
        options = {
          namedCurve,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        };
      }

      const { publicKey, privateKey } = crypto.generateKeyPairSync(type, options);
      return { type, bits, publicKey, privateKey };
    } catch (e) {
      logger.error(`KeyPairTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = KeyPairTool;
