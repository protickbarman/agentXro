const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class StringSimilarityTool extends Tool {
  constructor() {
    super('string_similarity', {
      description: 'Calculate string similarity using Levenshtein, Jaro-Winkler, or n-gram methods',
      parameters: {
        type: 'object',
        properties: {
          a: { type: 'string', description: 'First string' },
          b: { type: 'string', description: 'Second string' },
          method: { type: 'string', enum: ['levenshtein', 'jaro_winkler', 'ngram'], description: 'Similarity method' },
        },
        required: ['a', 'b'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.a) throw new Error('a required');
    if (!params.b) throw new Error('b required');
    return true;
  }

  levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    const distance = dp[m][n];
    const maxLen = Math.max(a.length, b.length);
    const similarity = maxLen === 0 ? 1 : 1 - distance / maxLen;
    return { distance, similarity: Math.round(similarity * 10000) / 10000 };
  }

  jaroWinkler(a, b) {
    if (a === b) return { distance: 0, similarity: 1 };
    const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
    const aMatches = new Array(a.length).fill(false);
    const bMatches = new Array(b.length).fill(false);
    let matches = 0, transpositions = 0;
    for (let i = 0; i < a.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, b.length);
      for (let j = start; j < end; j++) {
        if (bMatches[j]) continue;
        if (a[i] !== b[j]) continue;
        aMatches[i] = true;
        bMatches[j] = true;
        matches++;
        break;
      }
    }
    if (matches === 0) return { distance: 1, similarity: 0 };
    let k = 0;
    for (let i = 0; i < a.length; i++) {
      if (!aMatches[i]) continue;
      while (!bMatches[k]) k++;
      if (a[i] !== b[k]) transpositions++;
      k++;
    }
    const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
    let prefix = 0;
    for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
      if (a[i] === b[i]) prefix++; else break;
    }
    const winkler = jaro + prefix * 0.1 * (1 - jaro);
    return { distance: Math.round((1 - winkler) * 10000) / 10000, similarity: Math.round(winkler * 10000) / 10000 };
  }

  ngram(a, b, n = 2) {
    const getGrams = s => {
      const grams = new Map();
      for (let i = 0; i <= s.length - n; i++) {
        const g = s.slice(i, i + n);
        grams.set(g, (grams.get(g) || 0) + 1);
      }
      return grams;
    };
    const gramsA = getGrams(a);
    const gramsB = getGrams(b);
    let intersection = 0, union = 0;
    const allKeys = new Set([...gramsA.keys(), ...gramsB.keys()]);
    for (const key of allKeys) {
      const ca = gramsA.get(key) || 0;
      const cb = gramsB.get(key) || 0;
      intersection += Math.min(ca, cb);
      union += Math.max(ca, cb);
    }
    const similarity = union === 0 ? 1 : intersection / union;
    return { distance: Math.round((1 - similarity) * 10000) / 10000, similarity: Math.round(similarity * 10000) / 10000 };
  }

  async execute(params) {
    try {
      this.validate(params);
      const { a, b, method = 'levenshtein' } = params;
      let result;
      switch (method) {
        case 'levenshtein':
          result = this.levenshtein(a, b);
          break;
        case 'jaro_winkler':
          result = this.jaroWinkler(a, b);
          break;
        case 'ngram':
          result = this.ngram(a, b);
          break;
        default:
          result = this.levenshtein(a, b);
      }
      return result;
    } catch (e) {
      logger.error(`StringSimilarityTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = StringSimilarityTool;
