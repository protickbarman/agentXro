const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class HttpGetTool extends Tool {
  constructor() {
    super('http_get', {
      description: 'Perform HTTP GET request',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Target URL' },
          headers: { type: 'object', description: 'Request headers' },
          timeout: { type: 'number', description: 'Timeout in ms' },
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
      const res = await axios.get(p.url, {
        headers: p.headers || {},
        timeout: p.timeout || this.timeout,
        responseType: 'arraybuffer',
      });
      const data = res.data instanceof Buffer ? res.data.toString('utf8') : res.data;
      return this.formatResult({
        status: res.status,
        headers: res.headers,
        data,
        size: res.data.length,
      });
    } catch (e) {
      logger.error(`HttpGetTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = HttpGetTool;
