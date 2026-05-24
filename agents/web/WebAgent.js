const Agent = require('../base/Agent');
const logger = require('../../config/logger');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cheerio = require('cheerio');
const axios = require('axios');

class WebAgent extends Agent {
  constructor(llmManager, toolRegistry) {
    super('web', 'sub');
    this.llmManager = llmManager;
    this.toolRegistry = toolRegistry;
    this.outputDir = path.join(__dirname, '../../outputs/web');
  }

  _broadcastStatus(conversationId, step, label, data = {}) {
    if (global.broadcastToConversation) {
      global.broadcastToConversation(conversationId, {
        type: 'status_update', conversationId, step, label,
        agent: 'web', data, timestamp: Date.now(),
      });
    }
  }

  async execute(context) {
    const startTime = Date.now();
    logger.info('Web Agent executing', { userMessage: context.userMessage.substring(0, 50) });

    try {
      const { userMessage, conversationHistory = [], conversationId } = context;
      const urls = this._extractUrls(userMessage);
      let scrapedData = [];
      let files = [];

      if (urls.length > 0) {
        for (const url of urls) {
          try {
            const html = await this._fetchPage(url);
            const $ = cheerio.load(html);
            const title = $('title').text() || 'Untitled';
            const text = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 2000);
            const links = $('a[href]').map((i, el) => $(el).attr('href')).get().slice(0, 10);

            const fileName = `scrape_${uuidv4().slice(0, 8)}.html`;
            const outputPath = path.join(this.outputDir, fileName);
            fs.writeFileSync(outputPath, html);
            files.push(outputPath);

            scrapedData.push({ url, title, text, links, file: outputPath });
          } catch (fetchError) {
            logger.warn(`Failed to scrape ${url}`, { error: fetchError.message });
            scrapedData.push({ url, error: fetchError.message });
          }
        }
      }

      const analysisPrompt = `You are a Web Agent. ${scrapedData.length > 0 ?
        `Analyze this scraped web content:\n${scrapedData.map(d => `[${d.title}] ${d.text}`).join('\n\n')}` :
        `The user wants to: ${userMessage}\nProvide helpful information.`}

User request: ${userMessage}`;

      const analysis = await this.llmManager.chat(
        analysisPrompt,
        conversationHistory,
        {
          stream: true,
          maxTokens: 1024,
          temperature: 0.5,
          onChunk: (chunk) => {
            if (global.broadcastToConversation && conversationId) {
              global.broadcastToConversation(conversationId, {
                type: 'content_chunk',
                conversationId,
                content: chunk,
                timestamp: Date.now(),
              });
            }
          },
        }
      );

      const executionTime = Date.now() - startTime;

      return this.formatResponse({
        type: 'web_agent',
        response: analysis.content,
        scrapedData: scrapedData.map(d => ({ url: d.url, title: d.title, text: d.text?.substring(0, 200), file: d.file })),
        files,
        tokensUsed: analysis.tokensUsed,
        executionTime,
      });
    } catch (error) {
      logger.error('Web Agent execution failed', { error: error.message });
      throw error;
    }
  }

  _extractUrls(text) {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    return text.match(urlRegex) || [];
  }

  async _fetchPage(url) {
    const response = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (XroAgent/1.0)' }, maxRedirects: 3 });
    return response.data;
  }
}

module.exports = WebAgent;
