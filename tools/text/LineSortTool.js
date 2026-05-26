const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class LineSortTool extends Tool {
  constructor() {
    super('line_sort', {
      description: 'Sort lines alphabetically, numerically, reverse, or unique',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The input text' },
          mode: { type: 'string', enum: ['alpha', 'alpha_rev', 'numeric', 'numeric_rev', 'reverse', 'unique'], description: 'Sort mode' },
          caseSensitive: { type: 'boolean', description: 'Case sensitive sorting (default true)' },
        },
        required: ['text'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, mode = 'alpha', caseSensitive = true } = params;
      let lines = text.split('\n');
      switch (mode) {
        case 'alpha':
          lines.sort(caseSensitive ? undefined : (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
          break;
        case 'alpha_rev':
          lines.sort(caseSensitive ? undefined : (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
          lines.reverse();
          break;
        case 'numeric':
          lines.sort((a, b) => {
            const na = parseFloat(a), nb = parseFloat(b);
            if (isNaN(na) && isNaN(nb)) return caseSensitive ? a.localeCompare(b) : a.toLowerCase().localeCompare(b.toLowerCase());
            if (isNaN(na)) return 1;
            if (isNaN(nb)) return -1;
            return na - nb;
          });
          break;
        case 'numeric_rev':
          lines.sort((a, b) => {
            const na = parseFloat(a), nb = parseFloat(b);
            if (isNaN(na) && isNaN(nb)) return caseSensitive ? b.localeCompare(a) : b.toLowerCase().localeCompare(a.toLowerCase());
            if (isNaN(na)) return -1;
            if (isNaN(nb)) return 1;
            return nb - na;
          });
          break;
        case 'reverse':
          lines.reverse();
          break;
        case 'unique':
          lines = [...new Set(lines)];
          break;
        default:
          lines.sort();
      }
      return { result: lines.join('\n') };
    } catch (e) {
      logger.error(`LineSortTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = LineSortTool;
