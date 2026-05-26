const Tool = require('../base/Tool');
const crypto = require('crypto');
const logger = require('../../config/logger');

class CertificateTool extends Tool {
  constructor() {
    super('certificate', {
      description: 'Parse X509 certificate info',
      parameters: {
        type: 'object',
        properties: {
          pem: { type: 'string', description: 'PEM-encoded certificate' },
        },
        required: ['pem'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.pem) throw new Error('pem required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { pem } = params;
      const cert = new crypto.X509Certificate(pem);

      const info = {
        subject: cert.subject,
        issuer: cert.issuer,
        subjectAltName: cert.subjectAltName,
        validFrom: cert.validFrom,
        validTo: cert.validTo,
        serialNumber: cert.serialNumber,
        fingerprint: cert.fingerprint,
        fingerprint256: cert.fingerprint256,
        fingerprint512: cert.fingerprint512,
        keyUsage: cert.keyUsage,
        publicKey: cert.publicKey?.export({ type: 'spki', format: 'pem' }) || null,
      };

      return info;
    } catch (e) {
      logger.error(`CertificateTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = CertificateTool;
