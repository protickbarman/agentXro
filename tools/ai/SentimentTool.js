const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const POSITIVE_WORDS = [
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'brilliant', 'love', 'beautiful',
  'happy', 'joy', 'awesome', 'outstanding', 'superb', 'perfect', 'nice', 'best', 'positive', 'success',
  'win', 'winning', 'delight', 'pleased', 'glad', 'fortunate', 'lucky', 'favorite', 'remarkable',
  'impressive', 'incredible', 'marvelous', 'splendid', 'magnificent', 'satisfied', 'grateful', 'thrilled',
  'delighted', 'ecstatic', 'elated', 'cheerful', 'optimistic', 'hopeful', 'brilliant', 'fantastic',
  'terrific', 'lovely', 'pleasant', 'enjoyable', 'fabulous', 'genius', 'legendary', 'extraordinary',
];

const NEGATIVE_WORDS = [
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'ugly', 'poor', 'sad', 'angry', 'mad',
  'disappointed', 'disappointing', 'failure', 'fail', 'lost', 'loss', 'negative', 'wrong', 'broken',
  'damage', 'damaged', 'awful', 'dreadful', 'atrocious', 'lousy', 'miserable', 'horrendous', 'hideous',
  'disgusting', 'repulsive', 'terrible', 'painful', 'hurt', 'suffering', 'tragic', 'horrible',
  'annoying', 'frustrating', 'irritating', 'depressing', 'pathetic', 'useless', 'waste', 'terrible',
  'sucks', 'worst', 'hateful', 'cruel', 'nasty', 'evil', 'wicked', 'horrible', 'fear', 'scared',
];

class SentimentTool extends Tool {
  constructor() {
    super('sentiment', {
      description: 'Analyze sentiment of text using positive/negative word counting',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to analyze' },
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
      const words = p.text.toLowerCase().match(/\b[a-z]+\b/g) || [];
      const positive = words.filter(w => POSITIVE_WORDS.includes(w));
      const negative = words.filter(w => NEGATIVE_WORDS.includes(w));
      const score = positive.length - negative.length;
      const comparative = words.length > 0 ? score / words.length : 0;
      return this.formatResult({
        score,
        comparative: parseFloat(comparative.toFixed(4)),
        positive: positive.length,
        negative: negative.length,
        words: { positive: [...new Set(positive)], negative: [...new Set(negative)] },
        sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral',
      });
    } catch (e) {
      logger.error(`SentimentTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = SentimentTool;
