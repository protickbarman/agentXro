const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const COMMON_WORDS = [
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you',
  'do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one',
  'all','would','there','their','what','so','up','out','if','about','who','get','which','go','me',
  'when','make','can','like','time','no','just','him','know','take','people','into','year','your',
  'good','some','could','them','see','other','than','then','now','look','only','come','its','over',
  'think','also','back','after','use','two','how','our','work','first','well','way','even','new',
  'want','because','any','these','give','day','most','us','great','between','need','large','often',
  'very','thing','place','much','every','long','down','should','man','old','still','home','here',
  'life','hand','part','right','high','such','same','own','while','might','last','let','keep',
  'face','put','ask','small','set','next','change','point','always','big','country','city',
  'world','without','turn','mean','call','run','open','seem','together','begin','show','hear',
  'play','run','move','live','believe','bring','happen','write','provide','sit','stand','lose',
  'pay','meet','include','continue','set','learn','change','lead','understand','watch','follow',
  'stop','create','speak','read','allow','add','spend','grow','open','walk','win','teach','offer',
  'remember','consider','appear','buy','serve','die','send','build','stay','fall','cut','reach',
  'kill','remain','suggest','raise','pass','sell','require','report','decide','pull','develop',
  'carry','break','receive','agree','support','explain','expect','announce','produce','happen',
  'actually','really','simply','probably','especially','finally','however','although','because',
  'therefore','furthermore','meanwhile','nevertheless','otherwise','consequently','moreover',
  'additionally','accordingly','indeed','instead','perhaps','certainly','definitely','absolutely',
];

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
    }
  }
  return dp[m][n];
}

class SpellCheckTool extends Tool {
  constructor() {
    super('spell_check', {
      description: 'Check text spelling using Levenshtein distance against common word list',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to spell check' },
          lang: { type: 'string', description: 'Language (default: en)' },
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
      const words = p.text.match(/\b[a-zA-Z]+\b/g) || [];
      const dict = new Set(COMMON_WORDS);
      const misspellings = [];

      for (const word of words) {
        const lower = word.toLowerCase();
        if (!dict.has(lower) && lower.length > 1) {
          const suggestions = COMMON_WORDS
            .map(w => ({ word: w, dist: levenshtein(lower, w) }))
            .filter(s => s.dist <= 3 && s.dist > 0)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 5)
            .map(s => s.word);
          misspellings.push({ word, suggestions, context: p.text.slice(Math.max(0, p.text.indexOf(word) - 20), p.text.indexOf(word) + word.length + 20) });
        }
      }

      return this.formatResult({
        misspellings,
        totalMisspelled: misspellings.length,
        totalWords: words.length,
        suggestions: Object.fromEntries(misspellings.map(m => [m.word, m.suggestions])),
        hasErrors: misspellings.length > 0,
      });
    } catch (e) {
      logger.error(`SpellCheckTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = SpellCheckTool;
