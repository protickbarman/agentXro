const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const LANG_PATTERNS = {
  en: { name: 'English', words: ['the', 'and', 'you', 'that', 'was', 'for', 'are', 'with', 'have', 'this', 'from', 'they', 'will', 'would', 'about', 'there', 'their', 'what', 'which', 'when', 'can', 'like', 'just', 'over', 'also', 'than', 'then', 'them', 'very', 'because', 'some', 'could', 'should', 'been', 'more', 'these', 'those', 'other', 'than', 'after', 'into', 'while', 'where', 'here', 'there'] },
  es: { name: 'Spanish', words: ['el', 'la', 'los', 'las', 'que', 'de', 'del', 'en', 'por', 'con', 'para', 'una', 'un', 'una', 'por', 'como', 'más', 'pero', 'sus', 'sobre', 'entre', 'este', 'esta', 'esto', 'todo', 'también', 'muy', 'sin', 'porque', 'cuando', 'donde', 'desde', 'hasta', 'si', 'cual', 'quien', 'ahora', 'aquí', 'ser', 'estar', 'haber', 'tener', 'hacer', 'poder', 'decir', 'ir', 'ver', 'dar', 'saber', 'querer', 'llegar', 'pasar', 'deber', 'buscar', 'creer', 'hablar', 'dejar', 'llamar', 'seguir', 'encontrar', 'quedar', 'pensar', 'tomar', 'salir', 'entrar', 'volver', 'correr', 'vivir', 'comer', 'beber', 'abrir', 'escribir', 'leer', 'oír'] },
  fr: { name: 'French', words: ['le', 'la', 'les', 'des', 'de', 'du', 'et', 'est', 'que', 'dans', 'pour', 'sur', 'avec', 'pas', 'plus', 'tout', 'ses', 'son', 'cette', 'ces', 'leur', 'aussi', 'mais', 'ou', 'où', 'donc', 'car', 'sans', 'très', 'comme', 'quand', 'entre', 'par', 'être', 'avoir', 'faire', 'dire', 'pouvoir', 'aller', 'voir', 'savoir', 'venir', 'devoir', 'croire', 'mettre', 'prendre', 'donner', 'vouloir', 'falloir', 'passer', 'trouver', 'rendre', 'suivre', 'parler', 'penser', 'aimer', 'appeler', 'entrer', 'sortir', 'vivre', 'laisser', 'regarder', 'comprendre'] },
  de: { name: 'German', words: ['der', 'die', 'das', 'und', 'ist', 'sich', 'nicht', 'ein', 'eine', 'auf', 'mit', 'auch', 'werden', 'sein', 'haben', 'für', 'von', 'aus', 'bei', 'nach', 'um', 'vor', 'durch', 'über', 'zur', 'zum', 'an', 'oder', 'aber', 'denn', 'dann', 'schon', 'noch', 'immer', 'hier', 'dort', 'diese', 'dieser', 'dieses', 'diesem', 'diesen', 'kann', 'muss', 'will', 'soll', 'darf', 'weiß', 'sagen', 'machen', 'geben', 'kommen', 'sollen', 'müssen', 'können', 'wollen', 'dürfen', 'mögen', 'gehen', 'sehen', 'lassen', 'bleiben', 'liegen', 'stellen', 'halten', 'nennen', 'führen', 'zeigen'] },
  it: { name: 'Italian', words: ['il', 'la', 'le', 'gli', 'del', 'della', 'delle', 'dei', 'un', 'una', 'e', 'è', 'che', 'per', 'con', 'su', 'tra', 'fra', 'anche', 'non', 'si', 'ci', 'mi', 'ti', 'lo', 'ha', 'ho', 'hai', 'hanno', 'sono', 'era', 'stato', 'fare', 'dire', 'potere', 'volere', 'dovere', 'sapere', 'stare', 'avere', 'essere', 'andare', 'venire', 'parlare', 'vedere', 'dare', 'prendere', 'cercare', 'trovare', 'lasciare', 'pensare', 'credere', 'chiamare', 'sentire', 'aprire', 'chiudere', 'mettere', 'vivere', 'scrivere', 'leggere', 'correre'] },
  pt: { name: 'Portuguese', words: ['o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'um', 'uma', 'que', 'é', 'em', 'para', 'com', 'como', 'por', 'mais', 'mas', 'se', 'já', 'não', 'era', 'ser', 'ter', 'haver', 'fazer', 'dizer', 'poder', 'dever', 'saber', 'ir', 'ver', 'dar', 'estar', 'ficar', 'passar', 'achar', 'falar', 'pensar', 'viver', 'andar', 'chegar', 'sair', 'entrar', 'olhar', 'querer', 'precisar', 'começar', 'acabar', 'levar', 'pedir', 'mostrar'] },
  nl: { name: 'Dutch', words: ['de', 'het', 'een', 'van', 'en', 'die', 'dat', 'met', 'voor', 'op', 'niet', 'zijn', 'ook', 'aan', 'door', 'bij', 'als', 'nog', 'dan', 'naar', 'uit', 'over', 'om', 'hem', 'haar', 'hun', 'maar', 'wel', 'ze', 'er', 'zich', 'worden', 'hebben', 'zullen', 'mogen', 'kunnen', 'moeten', 'weten', 'zeggen', 'maken', 'gaan', 'komen', 'laten', 'zien', 'staan', 'geven', 'houden', 'vinden', 'blijven', 'nemen', 'doen', 'vragen', 'geloven', 'noemen'] },
  ru: { name: 'Russian', words: ['и', 'в', 'не', 'на', 'я', 'что', 'то', 'с', 'а', 'как', 'он', 'она', 'оно', 'они', 'мы', 'вы', 'ты', 'к', 'у', 'по', 'за', 'из', 'от', 'до', 'об', 'при', 'для', 'без', 'через', 'после', 'во', 'со', 'но', 'да', 'же', 'бы', 'ли', 'если', 'когда', 'потом', 'здесь', 'там', 'этот', 'это', 'эта', 'эти', 'весь', 'вся', 'все', 'мой', 'твой', 'наш', 'ваш', 'его', 'её', 'их', 'себя', 'который', 'что', 'чтобы', 'можно', 'надо', 'быть', 'иметь', 'мочь', 'сказать', 'знать', 'хотеть', 'делать', 'идти', 'видеть', 'думать', 'говорить', 'работать', 'жить', 'любить'] },
  zh: { name: 'Chinese', words: ['的', '了', '在', '是', '我', '有', '和', '不', '就', '人', '都', '一', '个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '里', '为', '与', '及', '但', '而', '或', '被', '把', '对', '用', '能', '让', '从', '打', '以', '又', '还', '虽然', '因为', '所以', '如果', '然后', '已经', '可以', '应该', '需要'] },
  ja: { name: 'Japanese', words: ['の', 'に', 'は', 'を', 'が', 'と', 'で', 'た', 'です', 'ます', 'した', 'いる', 'ある', 'なる', 'こと', 'から', 'まで', 'より', 'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'ここ', 'そこ', 'あそこ', 'わたし', 'あなた', 'かれ', 'かのじょ', 'ひと', 'もの', 'とき', 'ため', 'ので', 'のに', 'けど', 'しかし', 'そして', 'それで', 'または', 'だから', 'です', 'ありません', 'できる', 'わかる', 'する', 'くる', 'いく', 'みる', 'たべる', 'のむ', 'かく', 'よむ', 'はなす', 'きく', 'おもう', 'しる'] },
  ar: { name: 'Arabic', words: ['في', 'من', 'على', 'إلى', 'كان', 'هذا', 'هذه', 'ذلك', 'مع', 'عن', 'لا', 'ما', 'لم', 'لن', 'هل', 'إن', 'أن', 'قد', 'سوف', 'أو', 'بعد', 'قبل', 'فوق', 'تحت', 'بين', 'دون', 'حتى', 'عند', 'كل', 'بعض', 'أي', 'منذ', 'خلال', 'حول', 'بسبب', 'بدون', 'أمام', 'وراء', 'أين', 'متى', 'كيف', 'لذلك', 'لكن', 'أيضا', 'جدا', 'هناك', 'هنا', 'نحن', 'هم', 'هو', 'هي', 'أنا', 'أنت', 'أنتم', 'الذي', 'التي', 'الذين', 'اللواتي'] },
};

class LanguageDetectTool extends Tool {
  constructor() {
    super('language_detect', {
      description: 'Detect language by common word patterns',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to analyze for language detection' },
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
      const words = p.text.toLowerCase().match(/\b[a-z\u00C0-\u024F]+\b/g) || [];
      const total = words.length;
      if (total === 0) return this.formatResult({ language: 'Unknown', confidence: 0, languages: [] });

      const scores = {};
      for (const [code, lang] of Object.entries(LANG_PATTERNS)) {
        let count = 0;
        for (const w of lang.words) {
          if (words.includes(w)) count++;
        }
        scores[code] = count / lang.words.length;
      }

      const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      const top = entries[0];
      const languages = entries.filter(e => e[1] > 0).map(([code, score]) => ({
        code,
        name: LANG_PATTERNS[code].name,
        score: parseFloat(score.toFixed(4)),
      }));

      return this.formatResult({
        language: top[1] > 0 ? LANG_PATTERNS[top[0]].name : 'Unknown',
        code: top[1] > 0 ? top[0] : 'unknown',
        confidence: parseFloat(top[1].toFixed(4)),
        languages,
        totalWords: total,
      });
    } catch (e) {
      logger.error(`LanguageDetectTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = LanguageDetectTool;
