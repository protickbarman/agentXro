const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class NewsApiTool extends Tool {
  constructor() {
    super('news_api', {
      description: 'Fetch news headlines from RSS feeds or free news sources',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          count: { type: 'number', description: 'Number of articles' },
          source: { type: 'string', description: 'News source (bbc, cnn, reuters, etc.)' },
        },
      },
    });
    this.timeout = 15000;
  }

  validate(p) {
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const count = p.count || 10;
      const source = p.source || 'bbc';
      const feedMap = {
        bbc: 'https://feeds.bbci.co.uk/news/rss.xml',
        cnn: 'http://rss.cnn.com/rss/edition.rss',
        reuters: 'https://www.reutersagency.com/feed/',
        nyt: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
        guardian: 'https://www.theguardian.com/world/rss',
      };
      const feedUrl = feedMap[source] || `https://news.google.com/rss/search?q=${encodeURIComponent(p.query || 'top news')}&hl=en-US&gl=US&ceid=US:en`;
      const res = await axios.get(feedUrl, { timeout: this.timeout, responseType: 'text' });
      const xml = res.data;
      const items = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < count) {
        const item = match[1];
        const title = (item.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') || '';
        const link = (item.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || '';
        const desc = (item.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') || '';
        const pubDate = (item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || '';
        items.push({ title: title.replace(/<\/?[^>]+>/g, ''), link, description: desc.replace(/<\/?[^>]+>/g, ''), pubDate });
      }
      return this.formatResult({ articles: items, total: items.length, source, query: p.query });
    } catch (e) {
      logger.error(`NewsApiTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = NewsApiTool;
