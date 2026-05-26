const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class ScreenshotTool extends Tool {
  constructor() {
    super('screenshot', {
      description: 'Take a screenshot of a webpage (requires puppeteer)',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to screenshot' },
          width: { type: 'number', description: 'Viewport width' },
          height: { type: 'number', description: 'Viewport height' },
        },
        required: ['url'],
      },
    });
  }

  validate(p) {
    if (!p.url || typeof p.url !== 'string') throw new Error('url is required and must be a string');
    return true;
  }

  execute(p) {
    try {
      this.validate(p);
      return this.formatResult({
        note: 'Screenshot requires puppeteer which is not installed. Install with: npm install puppeteer',
        url: p.url,
        width: p.width || 1920,
        height: p.height || 1080,
      });
    } catch (e) {
      logger.error(`ScreenshotTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = ScreenshotTool;
