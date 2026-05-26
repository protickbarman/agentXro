const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const CATEGORY_KEYWORDS = {
  technology: ['computer','software','hardware','programming','code','app','application','digital','data','server','cloud','api','database','algorithm','ai','artificial intelligence','machine learning','web','internet','tech','cyber','security','network','device','system','platform','framework','library','function','variable','bug','debug','deploy','git','github','linux','windows','macos','browser','chrome','firefox','electron','node','react','python','javascript','java','sql','html','css'],
  sports: ['football','soccer','basketball','tennis','baseball','cricket','hockey','golf','swimming','athlete','olympic','championship','league','match','game','score','player','coach','team','stadium','tournament','medal','goal','race','tour','season','win','lose','draw','referee','foul','penalty','quarterback','pitcher','batter'],
  politics: ['government','election','president','congress','senate','parliament','democracy','vote','campaign','policy','law','bill','amendment','party','republican','democrat','minister','prime minister','candidate','political','legislation','regulation','tax','budget','diplomacy','treaty','sanction','war','peace','rights','freedom','constitution','judge','court'],
  health: ['doctor','hospital','disease','medical','patient','surgery','medicine','drug','treatment','therapy','diagnosis','symptom','health','nutrition','exercise','fitness','vitamin','vaccine','virus','infection','chronic','acute','mental','physical','pain','painkiller','prescription','clinic','nurse','surgeon','cardio','cancer','diabetes','obesity'],
  business: ['market','company','startup','investment','stock','finance','economy','revenue','profit','loss','ceo','board','shareholder','merger','acquisition','ipo','funding','venture','capital','asset','liability','accounting','audit','management','strategy','marketing','sales','brand','consumer','customer','retail','wholesale','supply chain','logistics'],
  science: ['research','study','experiment','laboratory','theory','hypothesis','data','analysis','discovery','scientist','biology','chemistry','physics','astronomy','genetics','evolution','species','environment','climate','energy','quantum','molecule','atom','cell','dna','robot','space','nasa','particle','telescope','microscope'],
  entertainment: ['movie','film','music','song','album','concert','show','series','netflix','hollywood','celebrity','actor','actress','director','producer','stage','theatre','broadway','comedy','drama','horror','action','thriller','comedy','documentary','animation','gaming','video game','esports','streaming','tiktok','youtube','instagram'],
  education: ['school','university','college','student','teacher','professor','course','class','lesson','homework','exam','test','grade','degree','diploma','scholarship','research','academic','study','learn','knowledge','science','math','history','literature','language','training','workshop','seminar','lecture','curriculum','syllabus','tutor'],
};

class TextClassifyTool extends Tool {
  constructor() {
    super('text_classify', {
      description: 'Classify text into categories using keyword matching',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to classify' },
          categories: { type: 'array', items: { type: 'string' }, description: 'Categories to consider' },
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
      const text = p.text.toLowerCase();
      const cats = p.categories || Object.keys(CATEGORY_KEYWORDS);
      const scores = {};
      const totalWords = (text.match(/\b[a-z]+\b/g) || []).length;

      for (const cat of cats) {
        const keywords = CATEGORY_KEYWORDS[cat.toLowerCase()] || [];
        let score = 0;
        for (const kw of keywords) {
          const regex = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
          const matches = text.match(regex);
          if (matches) score += matches.length;
        }
        scores[cat] = totalWords > 0 ? parseFloat((score / totalWords).toFixed(4)) : 0;
      }

      const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      const top = sorted[0] || ['unknown', 0];

      return this.formatResult({
        category: top[0],
        confidence: top[1],
        scores,
        categories: { available: Object.keys(CATEGORY_KEYWORDS), selected: cats },
      });
    } catch (e) {
      logger.error(`TextClassifyTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = TextClassifyTool;
