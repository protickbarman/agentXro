const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class WebSearchTool extends Tool {
  constructor() {
    super('web_search', {
      description: 'Search the web via DuckDuckGo API',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          count: { type: 'number', description: 'Number of results (max 20)' },
        },
        required: ['query'],
      },
    });
    this.timeout = 15000;
  }

  validate(p) {
    if (!p.query || typeof p.query !== 'string') throw new Error('query is required and must be a string');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(p.query)}&format=json&no_html=1&skip_disambig=1`;
      const count = p.count || 10;
      const res = await axios.get(url, { timeout: this.timeout });
      const results = (res.data.RelatedTopics || []).slice(0, count).map(r => ({
        title: r.Text ? r.Text.split(' - ')[0] : '',
        snippet: r.Text || '',
        url: r.FirstURL || '',
      }));
      return this.formatResult({ results, total: results.length });
    } catch (e) {
      logger.error(`WebSearchTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = WebSearchTool;
