const Tool = require('../base/Tool');
const tls = require('tls');
const logger = require('../../config/logger');

class SslCheckTool extends Tool {
  constructor() {
    super('ssl_check', {
      description: 'Check SSL certificate details for a hostname',
      parameters: {
        type: 'object',
        properties: {
          hostname: { type: 'string', description: 'Hostname to check' },
          port: { type: 'number', description: 'Port (default 443)' },
        },
        required: ['hostname'],
      },
    });
    this.timeout = 15000;
  }

  validate(params) {
    if (!params.hostname) throw new Error('hostname required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { hostname, port = 443 } = params;
      const cert = await new Promise((resolve, reject) => {
        const socket = tls.connect(port, hostname, { servername: hostname }, () => {
          const c = socket.getPeerCertificate(true);
          socket.end();
          resolve(c);
        });
        socket.setTimeout(10000);
        socket.on('error', reject);
        socket.on('timeout', () => { socket.destroy(); reject(new Error('SSL connection timed out')); });
      });
      return {
        hostname,
        port,
        subject: cert.subject,
        issuer: cert.issuer,
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        fingerprint: cert.fingerprint,
        serialNumber: cert.serialNumber,
        subjectaltname: cert.subjectaltnum,
        bits: cert.bits,
      };
    } catch (e) {
      logger.error(`SslCheckTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = SslCheckTool;
