const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class HttpPostTool extends Tool {
  constructor() {
    super('http_post', {
      description: 'Perform HTTP POST request',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Target URL' },
          body: { type: 'string', description: 'Request body' },
          headers: { type: 'object', description: 'Request headers' },
          json: { type: 'boolean', description: 'Send as JSON (auto stringifies)' },
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
      const headers = { ...(p.headers || {}) };
      let data = p.body;
      if (p.json !== false) {
        headers['Content-Type'] = 'application/json';
        data = typeof p.body === 'object' ? p.body : p.body;
      }
      const res = await axios.post(p.url, data, { headers, timeout: p.timeout || this.timeout });
      return this.formatResult({ status: res.status, headers: res.headers, data: res.data });
    } catch (e) {
      logger.error(`HttpPostTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = HttpPostTool;
