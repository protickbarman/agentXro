const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class MarkdownToHtmlTool extends Tool {
  constructor() {
    super('markdown_to_html', {
      description: 'Convert basic markdown to HTML',
      parameters: {
        type: 'object',
        properties: {
          markdown: { type: 'string', description: 'Markdown content to convert' },
        },
        required: ['markdown'],
      },
    });
  }

  validate(p) {
    if (!p.markdown || typeof p.markdown !== 'string') throw new Error('markdown is required and must be a string');
    return true;
  }

  execute(p) {
    try {
      this.validate(p);
      let html = p.markdown;
      html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
      html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
      html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
      html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
      html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
      html = html.replace(/_(.+?)_/g, '<em>$1</em>');
      html = html.replace(/`{3}([\s\S]*?)`{3}/g, '<pre><code>$1</code></pre>');
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
      html = html.replace(/\n\s*\n/g, '</p><p>');
      html = '<p>' + html + '</p>';
      html = html.replace(/<p><\/p>/g, '');
      return this.formatResult({ html, originalLength: p.markdown.length });
    } catch (e) {
      logger.error(`MarkdownToHtmlTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = MarkdownToHtmlTool;
