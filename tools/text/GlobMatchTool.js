const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class GlobMatchTool extends Tool {
  constructor() {
    super('glob_match', {
      description: 'Simple glob pattern matching with ? and * wildcards',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to match against' },
          pattern: { type: 'string', description: 'Glob pattern (? single char, * any chars)' },
          caseSensitive: { type: 'boolean', description: 'Case sensitive matching (default true)' },
        },
        required: ['text', 'pattern'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    if (!params.pattern) throw new Error('pattern required');
    return true;
  }

  globToRegex(pattern) {
    let re = '';
    for (const ch of pattern) {
      if (ch === '*') re += '.*';
      else if (ch === '?') re += '.';
      else re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return `^${re}$`;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, pattern, caseSensitive = true } = params;
      const regex = new RegExp(this.globToRegex(pattern), caseSensitive ? '' : 'i');
      const matched = regex.test(text);
      return { matched, match: matched ? text : null, pattern };
    } catch (e) {
      logger.error(`GlobMatchTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = GlobMatchTool;
