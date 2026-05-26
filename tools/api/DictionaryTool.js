const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class DictionaryTool extends Tool {
  constructor() {
    super('dictionary', {
      description: 'Look up word definitions, synonyms, antonyms, or rhymes',
      parameters: {
        type: 'object',
        properties: {
          word: { type: 'string', description: 'Word to look up' },
          op: { type: 'string', enum: ['define', 'synonyms', 'antonyms', 'rhymes'], description: 'Operation to perform' },
        },
        required: ['word', 'op'],
      },
    });
    this.timeout = 10000;
  }

  validate(p) {
    if (!p.word || typeof p.word !== 'string') throw new Error('word is required');
    if (!['define', 'synonyms', 'antonyms', 'rhymes'].includes(p.op)) throw new Error('op must be define, synonyms, antonyms, or rhymes');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      if (p.op === 'define') {
        const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(p.word)}`, { timeout: this.timeout });
        const d = res.data[0];
        const meanings = d.meanings?.map(m => ({
          partOfSpeech: m.partOfSpeech,
          definitions: m.definitions?.map(def => ({ definition: def.definition, example: def.example })),
          synonyms: m.synonyms,
          antonyms: m.antonyms,
        })) || [];
        return this.formatResult({ word: p.word, phonetic: d.phonetic || d.phonetics?.[0]?.text, meanings });
      }
      if (p.op === 'rhymes') {
        const res = await axios.get(`https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(p.word)}&max=20`, { timeout: this.timeout });
        return this.formatResult({ word: p.word, rhymes: res.data.map(r => ({ word: r.word, score: r.score })) });
      }
      const rel = p.op === 'synonyms' ? 'rel_syn' : 'rel_ant';
      const res = await axios.get(`https://api.datamuse.com/words?${rel}=${encodeURIComponent(p.word)}&max=20`, { timeout: this.timeout });
      return this.formatResult({ word: p.word, [p.op]: res.data.map(r => ({ word: r.word, score: r.score })) });
    } catch (e) {
      logger.error(`DictionaryTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = DictionaryTool;
