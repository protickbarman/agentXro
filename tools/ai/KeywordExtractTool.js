const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by','from','as','is',
  'was','were','be','been','being','have','has','had','do','does','did','will','would','can',
  'could','shall','should','may','might','must','it','its','it\'s','this','that','these','those',
  'i','me','my','myself','we','us','our','ours','you','your','yours','he','him','his','she',
  'her','hers','they','them','their','theirs','what','which','who','whom','when','where','why',
  'how','not','no','nor','so','if','then','than','too','very','just','also','more','some','any',
  'each','every','all','both','few','most','many','such','only','own','same','about','into',
  'over','after','before','between','under','again','further','once','here','there','when',
  'where','why','because','while','up','down','out','off','above','below','get','got','getting',
  'make','made','making','like','well','even','back','still','much','really','now','let','say',
  'said','thing','things','way','going','go','goes','went','see','saw','seen','know','knew',
  'think','thought','take','took','taken','come','came','come','want','wanted','look','looked',
  'use','used','using','find','found','give','gave','given','tell','told','ask','asked','work',
  'worked','seem','seemed','feel','felt','try','tried','leave','left','call','called',
]);

class KeywordExtractTool extends Tool {
  constructor() {
    super('keyword_extract', {
      description: 'Extract keywords from text using TF scoring and stop word removal',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to extract keywords from' },
          count: { type: 'number', description: 'Number of keywords to return' },
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
      const count = p.count || 10;
      const words = p.text.toLowerCase().match(/\b[a-z]+\b/g) || [];
      const freq = {};
      for (const w of words) {
        if (!STOP_WORDS.has(w) && w.length > 2) freq[w] = (freq[w] || 0) + 1;
      }
      const sorted = Object.entries(freq)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, count);
      const total = Object.values(freq).reduce((s, v) => s + v, 0);
      return this.formatResult({
        keywords: sorted.map(([word, freq]) => ({ word, frequency: freq, score: parseFloat((freq / total).toFixed(4)) })),
        total: sorted.length,
        uniqueWords: Object.keys(freq).length,
      });
    } catch (e) {
      logger.error(`KeywordExtractTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = KeywordExtractTool;
