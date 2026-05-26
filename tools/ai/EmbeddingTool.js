const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class EmbeddingTool extends Tool {
  constructor() {
    super('embedding', {
      description: 'Generate a simple TF (term frequency) vector embedding from text',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to embed' },
          dimensions: { type: 'number', description: 'Number of top tokens for the vector' },
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
      const dims = p.dimensions || 50;
      const words = p.text.toLowerCase().match(/\b[a-z]+\b/g) || [];
      const freq = {};
      for (const w of words) {
        if (w.length > 2) freq[w] = (freq[w] || 0) + 1;
      }
      const total = words.length;
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      const top = sorted.slice(0, dims);
      const vector = top.map(([, count]) => parseFloat((count / total).toFixed(6)));
      const tokens = top.map(([word]) => word);

      while (vector.length < dims) {
        vector.push(0);
        tokens.push('');
      }

      return this.formatResult({
        vector,
        dimension: vector.length,
        tokens,
        tokenCount: tokens.filter(t => t).length,
        originalLength: words.length,
        uniqueTokens: Object.keys(freq).length,
      });
    } catch (e) {
      logger.error(`EmbeddingTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = EmbeddingTool;
