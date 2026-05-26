const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class StringPadTool extends Tool {
  constructor() {
    super('string_pad', {
      description: 'Pad string to desired length',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          length: { type: 'number', description: 'Target length' },
          char: { type: 'string', description: 'Character to pad with (default space)' },
          side: { type: 'string', enum: ['start', 'end', 'both'], description: 'Which side to pad' },
        },
        required: ['text', 'length', 'side'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    if (params.length === undefined || params.length === null) throw new Error('length required');
    if (!params.side) throw new Error('side required');
    const valid = ['start', 'end', 'both'];
    if (!valid.includes(params.side)) throw new Error(`Invalid side: ${params.side}`);
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, length, char = ' ', side } = params;
      const padChar = char || ' ';
      let result;
      switch (side) {
        case 'start':
          result = text.padStart(length, padChar);
          break;
        case 'end':
          result = text.padEnd(length, padChar);
          break;
        case 'both': {
          const totalPad = Math.max(0, length - text.length);
          const left = Math.floor(totalPad / 2);
          const right = totalPad - left;
          result = padChar.repeat(left) + text + padChar.repeat(right);
          break;
        }
        default:
          result = text;
      }
      return { result };
    } catch (e) {
      logger.error(`StringPadTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = StringPadTool;
