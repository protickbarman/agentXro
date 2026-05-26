const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class HttpDeleteTool extends Tool {
  constructor() {
    super('http_delete', {
      description: 'Perform HTTP DELETE request',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Target URL' },
          headers: { type: 'object', description: 'Request headers' },
        },
        required: ['url'],
      },
    });
    this.timeout = 30000;
  }

  validate(p) {
    if (!p.url || typeof p.url !== 'string') throw new Error('url is required and must be a string');
    try { new URL(p.url); } catch { throw new Error('Invalid URL'); }
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const res = await axios.delete(p.url, { headers: p.headers || {}, timeout: p.timeout || this.timeout });
      return this.formatResult({ status: res.status, headers: res.headers, data: res.data });
    } catch (e) {
      logger.error(`HttpDeleteTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = HttpDeleteTool;
