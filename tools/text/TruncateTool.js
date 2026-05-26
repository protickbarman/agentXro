const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class TruncateTool extends Tool {
  constructor() {
    super('truncate', {
      description: 'Truncate text with ellipsis, word-boundary aware',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          maxLength: { type: 'number', description: 'Maximum length' },
          ellipsis: { type: 'string', description: 'Ellipsis string (default ...)' },
          wordBoundary: { type: 'boolean', description: 'Respect word boundaries (default true)' },
        },
        required: ['text', 'maxLength'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    if (params.maxLength === undefined || params.maxLength === null) throw new Error('maxLength required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, maxLength, ellipsis = '...', wordBoundary = true } = params;
      if (text.length <= maxLength) return { result: text };
      const ellipsisLen = ellipsis.length;
      const targetLen = maxLength - ellipsisLen;
      if (targetLen <= 0) return { result: ellipsis.slice(0, maxLength) };
      let truncated;
      if (wordBoundary) {
        const trimmed = text.slice(0, targetLen + 1);
        const lastSpace = trimmed.lastIndexOf(' ');
        truncated = lastSpace > 0 ? trimmed.slice(0, lastSpace) : text.slice(0, targetLen);
      } else {
        truncated = text.slice(0, targetLen);
      }
      return { result: truncated + ellipsis };
    } catch (e) {
      logger.error(`TruncateTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = TruncateTool;
