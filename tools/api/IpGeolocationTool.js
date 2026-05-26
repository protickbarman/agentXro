const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class IpGeolocationTool extends Tool {
  constructor() {
    super('ip_geolocation', {
      description: 'Geolocate an IP address (uses ip-api.com)',
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

  validate(p) {
    if (!p.ip || typeof p.ip !== 'string') throw new Error('ip is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const res = await axios.get(`http://ip-api.com/json/${encodeURIComponent(p.ip)}`, { timeout: this.timeout });
      const d = res.data;
      if (d.status === 'fail') return this.formatResult({ note: d.message || 'Lookup failed', ip: p.ip });
      return this.formatResult({
        ip: d.query, city: d.city, region: d.regionName, country: d.country, lat: d.lat, lon: d.lon,
        isp: d.isp, org: d.org, timezone: d.timezone, zip: d.zip,
      });
    } catch (e) {
      logger.error(`IpGeolocationTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = IpGeolocationTool;
