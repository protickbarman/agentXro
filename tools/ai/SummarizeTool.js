const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class SummarizeTool extends Tool {
  constructor() {
    super('summarize', {
      description: 'Extract key sentences from text using keyword density scoring',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to summarize' },
          maxSentences: { type: 'number', description: 'Maximum number of sentences in summary' },
          method: { type: 'string', enum: ['extractive', 'keyword'], description: 'Summarization method' },
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
      const maxSentences = p.maxSentences || 5;
      const sentences = p.text.match(/[^.!?\n]+[.!?]?(\s|$)/g) || [p.text];
      const words = p.text.toLowerCase().match(/\b[a-z]+\b/g) || [];

      const freq = {};
      for (const w of words) {
        if (w.length > 3) freq[w] = (freq[w] || 0) + 1;
      }

      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      const topWords = new Set(sorted.slice(0, 20).map(e => e[0]));

      const scored = sentences.map((s, i) => {
        const sWords = s.toLowerCase().match(/\b[a-z]+\b/g) || [];
        let score = 0;
        for (const w of sWords) {
          if (topWords.has(w)) score += freq[w];
        }
        if (p.method === 'extractive') score += (sentences.length - i) / sentences.length;
        return { sentence: s.trim(), score: sWords.length > 0 ? score / sWords.length : 0, index: i };
      });

      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, maxSentences).sort((a, b) => a.index - b.index);

      return this.formatResult({
        summary: top.map(s => s.sentence).join(' '),
        sentences: top.length,
        originalSentences: sentences.length,
        compression: parseFloat((top.length / sentences.length).toFixed(2)),
        method: p.method || 'keyword',
      });
    } catch (e) {
      logger.error(`SummarizeTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = SummarizeTool;
