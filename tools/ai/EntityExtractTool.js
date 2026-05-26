const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class EntityExtractTool extends Tool {
  constructor() {
    super('entity_extract', {
      description: 'Extract entities (emails, URLs, phone numbers, dates, hashtags, mentions) from text using regex',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to extract entities from' },
        },
        required: ['text'],
      },
    });
  }

  validate(p) {
    if (!p.text || typeof p.text !== 'string') throw new Error('text is required');
    return true;
  }

  execute(p) {
    try {
      this.validate(p);
      const text = p.text;
      const emails = [...new Set((text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []))];
      const urls = [...new Set((text.match(/https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/g) || []).map(u => u.replace(/[.,;:!?]+$/, '')))];
      const phones = [...new Set((text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g) || []).filter(p => p.replace(/[^\d]/g, '').length >= 7))];
      const dates = [...new Set((text.match(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},?\s?\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/gi) || []))];
      const hashtags = [...new Set((text.match(/#\w+/g) || []))];
      const mentions = [...new Set((text.match(/@\w+/g) || []))];
      const numbers = [...new Set((text.match(/\b\d+(?:\.\d+)?\b/g) || []).filter(n => n.length <= 15))];

      return this.formatResult({
        emails, urls, phones, dates, hashtags, mentions, numbers,
        counts: {
          emails: emails.length, urls: urls.length, phones: phones.length,
          dates: dates.length, hashtags: hashtags.length, mentions: mentions.length,
          numbers: numbers.length,
        },
      });
    } catch (e) {
      logger.error(`EntityExtractTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = EntityExtractTool;
