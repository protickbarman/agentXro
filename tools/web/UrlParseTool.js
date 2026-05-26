const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class UrlParseTool extends Tool {
  constructor() {
    super('url_parse', {
      description: 'Parse a URL into its components',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to parse' },
        },
        required: ['url'],
      },
    });
  }

  validate(p) {
    if (!p.url || typeof p.url !== 'string') throw new Error('url is required and must be a string');
    return true;
  }

  execute(p) {
    try {
      this.validate(p);
      const parsed = new URL(p.url);
      const query = {};
      parsed.searchParams.forEach((v, k) => { query[k] = v; });
      return this.formatResult({
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? '443' : parsed.protocol === 'http:' ? '80' : ''),
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
        query,
      });
    } catch (e) {
      logger.error(`UrlParseTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = UrlParseTool;
