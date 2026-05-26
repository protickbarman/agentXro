const Tool = require('../base/Tool');
const http = require('http');
const https = require('https');
const logger = require('../../config/logger');

class IpInfoTool extends Tool {
  constructor() {
    super('ip_info', {
      description: 'Get IP geolocation information using ip-api.com',
      parameters: {
        type: 'object',
        properties: {
          ip: { type: 'string', description: 'IP address to look up' },
        },
        required: ['ip'],
      },
    });
    this.timeout = 10000;
  }

  validate(params) {
    if (!params.ip) throw new Error('ip required');
    return true;
  }

  httpGet(url) {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http;
      mod.get(url, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        });
      }).on('error', reject);
    });
  }

  async execute(params) {
    try {
      this.validate(params);
      const { ip } = params;
      const data = await this.httpGet(`http://ip-api.com/json/${ip}`);
      return { ip, ...data };
    } catch (e) {
      logger.error(`IpInfoTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = IpInfoTool;
