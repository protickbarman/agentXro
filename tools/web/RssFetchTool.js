const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class RssFetchTool extends Tool {
  constructor() {
    super('rss_fetch', {
      description: 'Fetch and parse RSS/Atom feed',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Feed URL' },
          count: { type: 'number', description: 'Number of items to return' },
        },
        required: ['url'],
      },
    });
    this.timeout = 15000;
  }

  validate(p) {
    if (!p.url || typeof p.url !== 'string') throw new Error('url is required and must be a string');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const res = await axios.get(p.url, { timeout: this.timeout, responseType: 'text' });
      const xml = res.data;
      const count = p.count || 20;
      const items = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < count) {
        const item = match[1];
        const title = (item.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
        const link = (item.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || '';
        const description = (item.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || '';
        const pubDate = (item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || '';
        const guid = (item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) || [])[1] || '';
        items.push({ title: title.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'), link, description: description.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'), pubDate, guid });
      }
      if (items.length === 0) {
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
        while ((match = entryRegex.exec(xml)) !== null && items.length < count) {
          const item = match[1];
          const title = (item.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
          const link = (item.match(/<link[^>]*href=["']([^"']*)["']/i) || [])[1] || '';
          const summary = (item.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || [])[1] || '';
          const updated = (item.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) || [])[1] || '';
          items.push({ title, link, description: summary, pubDate: updated });
        }
      }
      return this.formatResult({ items, total: items.length, feedUrl: p.url });
    } catch (e) {
      logger.error(`RssFetchTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = RssFetchTool;
