const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class TextWrapTool extends Tool {
  constructor() {
    super('text_wrap', {
      description: 'Word wrap text to specified width',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          width: { type: 'number', description: 'Maximum line width' },
          indent: { type: 'string', description: 'Indent string for each line' },
          newline: { type: 'string', description: 'Newline character (default \\n)' },
        },
        required: ['text', 'width'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    if (params.width === undefined || params.width === null) throw new Error('width required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, width, indent = '', newline = '\n' } = params;
      const words = text.split(/\s+/);
      const lines = [];
      let current = '';
      for (const word of words) {
        if ((current + ' ' + word).trim().length > width) {
          lines.push(indent + current.trim());
          current = word;
        } else {
          current = current ? current + ' ' + word : word;
        }
      }
      if (current.trim()) lines.push(indent + current.trim());
      return { result: lines.join(newline) };
    } catch (e) {
      logger.error(`TextWrapTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = TextWrapTool;
