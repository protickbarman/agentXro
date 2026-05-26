const Tool = require('../base/Tool');
const dns = require('dns').promises;
const logger = require('../../config/logger');

class DnsLookupTool extends Tool {
  constructor() {
    super('dns_lookup', {
      description: 'Perform DNS resolution for a hostname',
      parameters: {
        type: 'object',
        properties: {
          hostname: { type: 'string', description: 'Hostname to resolve' },
          recordType: { type: 'string', enum: ['A', 'AAAA', 'MX', 'TXT', 'CNAME', 'NS'], description: 'DNS record type' },
        },
        required: ['hostname'],
      },
    });
    this.timeout = 10000;
  }

  validate(params) {
    if (!params.hostname) throw new Error('hostname required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { hostname, recordType = 'A' } = params;
      let records;
      switch (recordType) {
        case 'A':
          records = await dns.resolve4(hostname);
          break;
        case 'AAAA':
          records = await dns.resolve6(hostname);
          break;
        case 'MX':
          records = await dns.resolveMx(hostname);
          break;
        case 'TXT':
          records = await dns.resolveTxt(hostname);
          break;
        case 'CNAME':
          records = await dns.resolveCname(hostname);
          break;
        case 'NS':
          records = await dns.resolveNs(hostname);
          break;
        default:
          records = await dns.resolve4(hostname);
      }
      return { hostname, recordType, records };
    } catch (e) {
      logger.error(`DnsLookupTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = DnsLookupTool;
