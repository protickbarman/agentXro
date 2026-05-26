const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class MinifyTool extends Tool {
  constructor() {
    super('minify', {
      description: 'Basic JS/CSS/JSON minification by removing comments and unnecessary whitespace',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Source code' },
          type: { type: 'string', enum: ['js', 'css', 'json'], description: 'Code type' },
        },
        required: ['code', 'type'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.code) throw new Error('code required');
    if (!params.type) throw new Error('type required');
    const valid = ['js', 'css', 'json'];
    if (!valid.includes(params.type)) throw new Error(`Invalid type: ${params.type}`);
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      let { code, type } = params;
      let result;
      if (type === 'js' || type === 'css') {
        result = code
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*/g, '')
          .replace(/\s+/g, ' ')
          .replace(/\s*([{}();,=+\-*/<>!~|&?:])\s*/g, '$1')
          .replace(/\s*:\s*/g, ':')
          .replace(/\s*;\s*/g, ';')
          .replace(/;\s*}/g, '}')
          .trim();
      } else if (type === 'json') {
        try {
          result = JSON.stringify(JSON.parse(code));
        } catch (e) {
          throw new Error(`Invalid JSON: ${e.message}`);
        }
      }
      const originalLength = code.length;
      const minifiedLength = result.length;
      return {
        type,
        result,
        originalLength,
        minifiedLength,
        savings: `${((1 - minifiedLength / originalLength) * 100).toFixed(1)}%`,
      };
    } catch (e) {
      logger.error(`MinifyTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = MinifyTool;
