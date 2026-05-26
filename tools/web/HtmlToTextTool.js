const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class HtmlToTextTool extends Tool {
  constructor() {
    super('html_to_text', {
      description: 'Strip HTML tags and extract text content',
      parameters: {
        type: 'object',
        properties: {
          html: { type: 'string', description: 'HTML content to convert' },
          preserveLinks: { type: 'boolean', description: 'Show links as [text](url)' },
          preserveNewlines: { type: 'boolean', description: 'Preserve newline structure from block elements' },
        },
        required: ['html'],
      },
    });
  }

  validate(p) {
    if (!p.html || typeof p.html !== 'string') throw new Error('html is required and must be a string');
    return true;
  }

  execute(p) {
    try {
      this.validate(p);
      let text = p.html;
      if (p.preserveNewlines) {
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<\/?(p|div|h[1-6]|li|tr|blockquote|hr)[^>]*>/gi, '\n');
      }
      if (p.preserveLinks) {
        text = text.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
      }
      text = text.replace(/<[^>]*>/g, '');
      text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      text = text.replace(/\n{3,}/g, '\n\n').trim();
      return this.formatResult({ text, length: text.length, originalLength: p.html.length });
    } catch (e) {
      logger.error(`HtmlToTextTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = HtmlToTextTool;
