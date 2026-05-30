const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class WebSearchTool extends Tool {
  constructor() {
    super('web_search', {
      description: 'Search the web using configured search provider (Google, DuckDuckGo, or Bing). Configure GOOGLE_API_KEY + GOOGLE_CX or BING_API_KEY in .env for production use.',
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
      const count = Math.min(p.count || 10, 20);
      const provider = (process.env.SEARCH_PROVIDER || 'duckduckgo').toLowerCase();

      if (provider === 'google') {
        return await this._searchGoogle(p.query, count);
      } else if (provider === 'bing') {
        return await this._searchBing(p.query, count);
      } else if (provider === 'duckduckgo') {
        return await this._searchDuckDuckGo(p.query, count);
      }
      return this.formatError(new Error(`Unknown search provider: ${provider}. Use: google, bing, duckduckgo`));
    } catch (e) {
      logger.error(`WebSearchTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }

  async _searchGoogle(query, count) {
    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;
    if (!apiKey || !cx) {
      return this.formatError(new Error('Google Custom Search requires GOOGLE_API_KEY and GOOGLE_CX env vars. Get them free at https://programmablesearchengine.google.com/'));
    }
    const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: { key: apiKey, cx, q: query, num: count },
      timeout: this.timeout,
    });
    const results = (res.data.items || []).map(r => ({
      title: r.title || '',
      url: r.link || '',
      snippet: r.snippet || '',
    }));
    return this.formatResult({ results, total: results.length, query });
  }

  async _searchBing(query, count) {
    const apiKey = process.env.BING_API_KEY;
    if (!apiKey) {
      return this.formatError(new Error('Bing Search requires BING_API_KEY env var. Get it free at https://portal.azure.com/'));
    }
    const res = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
      params: { q: query, count },
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
      timeout: this.timeout,
    });
    const results = (res.data.webPages?.value || []).map(r => ({
      title: r.name || '',
      url: r.url || '',
      snippet: r.snippet || '',
    }));
    return this.formatResult({ results, total: results.length, query });
  }

  async _searchDuckDuckGo(query, count) {
    const res = await axios.get('https://api.duckduckgo.com/', {
      params: { q: query, format: 'json', no_html: 1, skip_disambig: 1 },
      timeout: this.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const results = [];
    for (const topic of (res.data.RelatedTopics || [])) {
      if (results.length >= count) break;
      if (topic.Topics) {
        for (const sub of topic.Topics) {
          if (results.length >= count) break;
          results.push({ title: sub.Text?.split(' - ')[0] || '', url: sub.FirstURL || '', snippet: sub.Text || '' });
        }
      } else {
        results.push({ title: topic.Text?.split(' - ')[0] || '', url: topic.FirstURL || '', snippet: topic.Text || '' });
      }
    }
    if (res.data.AbstractText) {
      results.unshift({ title: res.data.Heading || 'Summary', url: res.data.AbstractURL || '', snippet: res.data.AbstractText });
    }
    return this.formatResult({ results, total: results.length, query });
  }
}

module.exports = WebSearchTool;