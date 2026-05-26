const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class OpenWeatherTool extends Tool {
  constructor() {
    super('open_weather', {
      description: 'Get current weather for a location (uses wttr.in)',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name or location' },
          apiKey: { type: 'string', description: 'API key (optional, uses wttr.in by default)' },
        },
        required: ['location'],
      },
    });
    this.timeout = 10000;
  }

  validate(p) {
    if (!p.location || typeof p.location !== 'string') throw new Error('location is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      if (p.apiKey) {
        const url = 'https://api.openweathermap.org/data/2.5/weather';
        const res = await axios.get(url, { params: { q: p.location, appid: p.apiKey, units: 'metric' }, timeout: this.timeout });
        const d = res.data;
        return this.formatResult({
          temp: d.main?.temp, condition: d.weather?.[0]?.description, humidity: d.main?.humidity,
          wind: d.wind?.speed, city: d.name, country: d.sys?.country,
        });
      }
      const res = await axios.get(`https://wttr.in/${encodeURIComponent(p.location)}?format=j1`, { timeout: this.timeout });
      const c = res.data.current_condition?.[0];
      return this.formatResult({
        temp: c ? parseFloat(c.temp_C) : null,
        condition: c?.weatherDesc?.[0]?.value || '',
        humidity: c ? parseInt(c.humidity) : null,
        wind: c ? parseFloat(c.windspeedKmph) : null,
        city: res.data.nearest_area?.[0]?.areaName?.[0]?.value || p.location,
        country: res.data.nearest_area?.[0]?.country?.[0]?.value || '',
      });
    } catch (e) {
      logger.error(`OpenWeatherTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = OpenWeatherTool;
