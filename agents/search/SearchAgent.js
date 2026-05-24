const Agent = require('../base/Agent');
const logger = require('../../config/logger');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/**
 * Search Agent - Uses llama-3.1-8b (fastest at 412ms)
 */
class SearchAgent extends Agent {
  constructor(llmManager, toolRegistry) {
    super('search', 'sub');
    this.llmManager = llmManager;
    this.toolRegistry = toolRegistry;
    this.outputDir = path.join(__dirname, '../../outputs/search');
  }

  _broadcastStatus(conversationId, step, label, data = {}) {
    if (global.broadcastToConversation) {
      global.broadcastToConversation(conversationId, {
        type: 'status_update', conversationId, step, label,
        agent: 'search', data, timestamp: Date.now(),
      });
    }
  }

  async execute(context) {
    const startTime = Date.now();
    logger.info('Search Agent executing', { userMessage: context.userMessage.substring(0, 50) });

    try {
      const { userMessage, conversationHistory = [], conversationId } = context;

      const searchQueries = this._extractSearchQueries(userMessage);
      let searchResults = [];

      for (const q of searchQueries) {
        if (this.toolRegistry && this.toolRegistry.has('web_search')) {
          try {
            const searchTool = this.toolRegistry.get('web_search');
            const toolResult = await searchTool.execute({ query: q });
            searchResults.push({
              query: q,
              results: toolResult.results?.slice(0, 5) || [],
              totalResults: toolResult.totalResults || 0,
            });
          } catch (searchError) {
            logger.warn(`Web search failed for "${q}"`, { error: searchError.message });
          }
        }
      }

      const synthesisPrompt = `You are a Search Agent. ${searchResults.length > 0 ?
        `Based on these search results, provide a comprehensive answer:\n\n${searchResults.map(r => `Query: "${r.query}"\n${r.results.map(res => `- ${res.title}: ${res.snippet || 'No snippet'}`).join('\n')}`).join('\n\n')}` :
        `Provide information about: ${userMessage}`
      }

User request: ${userMessage}

Provide a well-organized summary.`;

      const synthesis = await this.llmManager.chat(
        synthesisPrompt,
        conversationHistory,
        {
          stream: true,
          maxTokens: 1024,
          temperature: 0.5,
          onChunk: (chunk) => {
            if (global.broadcastToConversation && context.conversationId) {
              global.broadcastToConversation(context.conversationId, {
                type: 'content_chunk',
                conversationId: context.conversationId,
                content: chunk,
                timestamp: Date.now(),
              });
            }
          },
        }
      );

      const fileName = `search_${uuidv4().slice(0, 8)}.json`;
      const outputPath = path.join(this.outputDir, fileName);
      fs.writeFileSync(outputPath, JSON.stringify({
        request: userMessage, searchQueries,
        results: searchResults.map(r => ({
          query: r.query,
          results: r.results.map(res => ({ title: res.title, snippet: res.snippet?.substring(0, 500), url: res.url })),
        })),
        synthesis: synthesis.content,
        timestamp: new Date().toISOString(),
      }, null, 2));

      const executionTime = Date.now() - startTime;

      return this.formatResponse({
        type: 'search_agent',
        response: synthesis.content,
        searchQueries,
        searchResults: searchResults.map(r => ({ query: r.query, resultCount: r.results.length })),
        files: [outputPath],
        tokensUsed: synthesis.tokensUsed,
        executionTime,
      });
    } catch (error) {
      logger.error('Search Agent execution failed', { error: error.message });
      throw error;
    }
  }

  _extractSearchQueries(text) {
    const quotedPhrases = text.match(/"([^"]+)"/g);
    if (quotedPhrases) return quotedPhrases.map(p => p.replace(/"/g, '').trim());
    return [text];
  }
}

module.exports = SearchAgent;
