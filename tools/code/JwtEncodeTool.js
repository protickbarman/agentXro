const Tool = require('../base/Tool');
const crypto = require('crypto');
const logger = require('../../config/logger');

class JwtEncodeTool extends Tool {
  constructor() {
    super('jwt_encode', {
      description: 'Encode a JWT with HS256 signature',
      parameters: {
        type: 'object',
        properties: {
          payload: { type: 'object', description: 'JWT payload claims' },
          secret: { type: 'string', description: 'HMAC secret key' },
        },
        required: ['payload', 'secret'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.payload) throw new Error('payload required');
    if (!params.secret) throw new Error('secret required');
    return true;
  }

  base64UrlEncode(data) {
    return Buffer.from(data).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  async execute(params) {
    try {
      this.validate(params);
      const { payload, secret } = params;
      const header = { alg: 'HS256', typ: 'JWT' };
      const headerB64 = this.base64UrlEncode(JSON.stringify(header));
      const payloadB64 = this.base64UrlEncode(JSON.stringify(payload));
      const signature = crypto.createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const token = `${headerB64}.${payloadB64}.${signature}`;
      return { token, header, payload };
    } catch (e) {
      logger.error(`JwtEncodeTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = JwtEncodeTool;
