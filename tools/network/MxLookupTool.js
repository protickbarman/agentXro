const Tool = require('../base/Tool');
const dns = require('dns').promises;
const logger = require('../../config/logger');

class MxLookupTool extends Tool {
  constructor() {
    super('mx_lookup', {
      description: 'Look up MX records for a domain',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Domain name' },
        },
        required: ['domain'],
      },
    });
    this.timeout = 10000;
  }

  validate(params) {
    if (!params.domain) throw new Error('domain required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { domain } = params;
      const exchanges = await dns.resolveMx(domain);
      const sorted = exchanges.sort((a, b) => a.priority - b.priority);
      return { domain, exchanges: sorted, count: sorted.length };
    } catch (e) {
      logger.error(`MxLookupTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = MxLookupTool;
