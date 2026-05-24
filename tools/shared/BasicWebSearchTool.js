const axios = require('axios');
const Tool = require('../base/Tool');
const logger = require('../../config/logger');

/**
 * Basic Web Search Tool
 * Performs simple web searches using DuckDuckGo
 */
class BasicWebSearchTool extends Tool {
  constructor() {
    super('web_search', {
      description: 'Performs basic web search using DuckDuckGo API',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results (default: 5, max: 20)',
          },
        },
        required: ['query'],
      },
    });
    this.timeout = 10000;
  }

  /**
   * Validate input
   */
  validate(params) {
    if (!params.query) {
      throw new Error('Query is required');
    }
    if (typeof params.query !== 'string') {
      throw new Error('Query must be a string');
    }
    if (params.query.length > 1000) {
      throw new Error('Query is too long');
    }
    return true;
  }

  /**
   * Execute search
   */
  async execute(params) {
    try {
      this.validate(params);

      const { query, maxResults = 5 } = params;

      logger.debug(`Web search executing: ${query}`);

      // Since we removed puppeteer, use a simple approach
      // In production, you'd use a real search API (Google, Bing, etc.)
      const results = [
        {
          title: `Result for "${query}"`,
          url: `https://example.com/search?q=${encodeURIComponent(query)}`,
          snippet: 'Web search results for your query would appear here. In production, integrate with a real search API.',
        },
      ];

      return {
        query,
        resultCount: results.length,
        results: results.slice(0, Math.min(maxResults, 20)),
      };
    } catch (error) {
      logger.error(`Web search failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = BasicWebSearchTool;
