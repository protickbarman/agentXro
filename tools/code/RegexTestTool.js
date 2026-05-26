const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class RegexTestTool extends Tool {
  constructor() {
    super('regex_test', {
      description: 'Test a regex pattern against text and return matches with capture groups',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regular expression pattern' },
          text: { type: 'string', description: 'Text to test against' },
          flags: { type: 'string', description: 'Regex flags (g, i, m, s, u)' },
        },
        required: ['pattern', 'text'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.pattern) throw new Error('pattern required');
    if (params.text === undefined || params.text === null) throw new Error('text required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { pattern, text, flags = '' } = params;
      let regex;
      try {
        regex = new RegExp(pattern, flags);
      } catch (e) {
        return { pattern, isValid: false, error: e.message, matches: [], count: 0 };
      }
      const matches = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        const entry = { fullMatch: match[0], index: match.index };
        if (match.length > 1) {
          entry.groups = {};
          for (let i = 1; i < match.length; i++) {
            entry.groups[i] = match[i];
          }
          if (match.groups) {
            entry.namedGroups = match.groups;
          }
        }
        matches.push(entry);
        if (!regex.global && !regex.sticky) break;
      }
      return { pattern, flags, isValid: true, matches, count: matches.length };
    } catch (e) {
      logger.error(`RegexTestTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = RegexTestTool;
