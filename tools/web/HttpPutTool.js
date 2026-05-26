const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class HttpPutTool extends Tool {
  constructor() {
    super('http_put', {
      description: 'Perform HTTP PUT request',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Target URL' },
          body: { type: 'string', description: 'Request body' },
          headers: { type: 'object', description: 'Request headers' },
        },
        required: ['url', 'body'],
      },
    });
    this.timeout = 30000;
  }

  validate(p) {
    if (!p.url || typeof p.url !== 'string') throw new Error('url is required and must be a string');
    if (p.body === undefined) throw new Error('body is required');
    try { new URL(p.url); } catch { throw new Error('Invalid URL'); }
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const headers = { 'Content-Type': 'application/json', ...(p.headers || {}) };
      const res = await axios.put(p.url, p.body, { headers, timeout: p.timeout || this.timeout });
      return this.formatResult({ status: res.status, headers: res.headers, data: res.data });
    } catch (e) {
      logger.error(`HttpPutTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = HttpPutTool;
