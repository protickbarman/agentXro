const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class EscapeTool extends Tool {
  constructor() {
    super('escape', {
      description: 'Escape or unescape HTML, URL, or JSON content',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          mode: { type: 'string', enum: ['html', 'url', 'json'], description: 'Escape mode' },
          direction: { type: 'string', enum: ['encode', 'decode'], description: 'Direction of transformation' },
        },
        required: ['text', 'mode'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    if (!params.mode) throw new Error('mode required');
    const validModes = ['html', 'url', 'json'];
    if (!validModes.includes(params.mode)) throw new Error(`Invalid mode: ${params.mode}`);
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, mode, direction = 'encode' } = params;
      let result;
      switch (mode) {
        case 'html':
          if (direction === 'encode') {
            result = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
          } else {
            result = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
          }
          break;
        case 'url':
          result = direction === 'encode' ? encodeURIComponent(text) : decodeURIComponent(text);
          break;
        case 'json':
          if (direction === 'encode') {
            result = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t').replace(/\b/g, '\\b').replace(/\f/g, '\\f');
          } else {
            result = text.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\b/g, '\b').replace(/\\f/g, '\f').replace(/\\\\/g, '\\');
          }
          break;
        default:
          result = text;
      }
      return { result };
    } catch (e) {
      logger.error(`EscapeTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = EscapeTool;
