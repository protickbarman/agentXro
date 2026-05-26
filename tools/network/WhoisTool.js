const Tool = require('../base/Tool');
const net = require('net');
const logger = require('../../config/logger');

class WhoisTool extends Tool {
  constructor() {
    super('whois', {
      description: 'WHOIS lookup for a domain',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Domain name to query' },
          server: { type: 'string', description: 'WHOIS server (default: whois.iana.org)' },
        },
        required: ['domain'],
      },
    });
    this.timeout = 15000;
  }

  validate(params) {
    if (!params.domain) throw new Error('domain required');
    return true;
  }

  queryWhois(host, query) {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(43, host);
      let data = '';
      socket.setTimeout(10000);
      socket.on('data', chunk => { data += chunk.toString(); });
      socket.on('end', () => resolve(data));
      socket.on('error', reject);
      socket.on('timeout', () => { socket.destroy(); reject(new Error('WHOIS query timed out')); });
      socket.write(`${query}\r\n`);
    });
  }

  async execute(params) {
    try {
      this.validate(params);
      const { domain, server } = params;
      const whoisServer = server || 'whois.iana.org';
      const raw = await this.queryWhois(whoisServer, domain);
      return { domain, server: whoisServer, raw };
    } catch (e) {
      logger.error(`WhoisTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = WhoisTool;
