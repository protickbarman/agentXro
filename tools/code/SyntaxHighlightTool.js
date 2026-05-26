const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const HIGHLIGHTERS = {
  javascript(code) {
    return code
      .replace(/\b(function|return|if|else|for|while|do|switch|case|break|continue|const|let|var|import|export|from|class|extends|new|this|async|await|try|catch|throw|typeof|instanceof|true|false|null|undefined|in|of|yield)\b/g, '<span class="kw">$1</span>')
      .replace(/\/\/.*/g, '<span class="cm">$&</span>')
      .replace(/\/\*[\s\S]*?\*\//g, '<span class="cm">$&</span>')
      .replace(/"([^"]*)"/g, '<span class="str">"$1"</span>')
      .replace(/'([^']*)'/g, "<span class='str'>'$1'</span>")
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');
  },
  python(code) {
    return code
      .replace(/\b(def|class|return|if|else|elif|for|while|import|from|as|try|except|finally|with|pass|break|continue|lambda|yield|async|await|True|False|None|self|raise|in|not|and|or|is|del|global|nonlocal)\b/g, '<span class="kw">$1</span>')
      .replace(/#.*/g, '<span class="cm">$&</span>')
      .replace(/'''[\s\S]*?'''|"""[\s\S]*?"""/g, '<span class="cm">$&</span>')
      .replace(/"([^"]*)"/g, '<span class="str">"$1"</span>')
      .replace(/'([^']*)'/g, "<span class='str'>'$1'</span>")
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');
  },
  html(code) {
    return code
      .replace(/(&lt;!?\/?)(\w+)/g, '$1<span class="tag">$2</span>')
      .replace(/(\w+)(=)(&quot;|&#39;|")/g, '<span class="attr">$1</span>$2')
      .replace(/&quot;(.*?)&quot;/g, '<span class="str">&quot;$1&quot;</span>');
  },
  css(code) {
    return code
      .replace(/([a-z-]+)\s*:/gi, '<span class="prop">$1</span>:')
      .replace(/#([0-9a-fA-F]{3,8})\b/g, '<span class="num">#$1</span>')
      .replace(/\b(\d+\.?\d*)(px|em|rem|%|vh|vw|pt)\b/g, '<span class="num">$1$2</span>')
      .replace(/\/\*[\s\S]*?\*\//g, '<span class="cm">$&</span>');
  },
  json(code) {
    try {
      return JSON.stringify(JSON.parse(code), null, 2);
    } catch {
      return code;
    }
  },
  xml(code) {
    return code
      .replace(/(&lt;!?\/?)(\w+)/g, '$1<span class="tag">$2</span>')
      .replace(/(\w+)(=)(&quot;|&#39;|")/g, '<span class="attr">$1</span>$2');
  },
  sql(code) {
    return code
      .replace(/\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|AS|DISTINCT|UNION|ALL|CASE|WHEN|THEN|ELSE|END|EXISTS|COUNT|SUM|AVG|MIN|MAX)\b/g, '<span class="kw">$1</span>')
      .replace(/'([^']*)'/g, "<span class='str'>'$1'</span>")
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');
  },
};

class SyntaxHighlightTool extends Tool {
  constructor() {
    super('syntax_highlight', {
      description: 'Apply basic syntax highlighting to code using HTML spans',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Source code' },
          language: { type: 'string', enum: ['javascript', 'python', 'html', 'css', 'json', 'xml', 'sql'], description: 'Programming language' },
        },
        required: ['code', 'language'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.code) throw new Error('code required');
    if (!params.language) throw new Error('language required');
    const valid = ['javascript', 'python', 'html', 'css', 'json', 'xml', 'sql'];
    if (!valid.includes(params.language)) throw new Error(`Unsupported language: ${params.language}`);
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { code, language } = params;
      const highlighter = HIGHLIGHTERS[language];
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const highlighted = highlighter(escaped);
      const html = `<pre><code class="language-${language}">${highlighted}</code></pre>`;
      return { language, html, highlighted };
    } catch (e) {
      logger.error(`SyntaxHighlightTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = SyntaxHighlightTool;
