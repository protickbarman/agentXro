const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class JwtDecodeTool extends Tool {
  constructor() {
    super('jwt_decode', {
      description: 'Decode a JWT token header and payload (no signature verification)',
      parameters: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT token string' },
        },
        required: ['token'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.token) throw new Error('token required');
    return true;
  }

  base64UrlDecode(str) {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return Buffer.from(padded, 'base64').toString('utf8');
  }

  async execute(params) {
    try {
      this.validate(params);
      const { token } = params;
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT: expected 3 parts');
      let header, payload;
      try {
        header = JSON.parse(this.base64UrlDecode(parts[0]));
        payload = JSON.parse(this.base64UrlDecode(parts[1]));
      } catch (e) {
        throw new Error(`Failed to decode: ${e.message}`);
      }
      return { header, payload, signature: parts[2] };
    } catch (e) {
      logger.error(`JwtDecodeTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = JwtDecodeTool;
