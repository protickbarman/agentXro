const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class PixelateTool extends Tool {
  constructor() {
    super('pixelate', {
      description: 'Pixelate an image (base64 PNG) - returns metadata about the operation',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Base64 encoded PNG image' },
          blockSize: { type: 'number', description: 'Size of pixelation blocks' },
        },
        required: ['data'],
      },
    });
  }

  validate(p) {
    if (!p.data || typeof p.data !== 'string') throw new Error('data is required');
    return true;
  }

  execute(p) {
    try {
      this.validate(p);
      const b64 = p.data.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(b64, 'base64');
      const blockSize = p.blockSize || 10;

      let width = 0, height = 0, format = 'Unknown';
      if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
        width = buf.readUInt32BE(16);
        height = buf.readUInt32BE(20);
        format = 'PNG';
      } else if (buf[0] === 0xFF && buf[1] === 0xD8) {
        format = 'JPEG';
      }

      const blocksX = width > 0 ? Math.ceil(width / blockSize) : 0;
      const blocksY = height > 0 ? Math.ceil(height / blockSize) : 0;

      return this.formatResult({
        format,
        originalDimensions: width > 0 ? { width, height } : null,
        blockSize,
        blocksX,
        blocksY,
        totalBlocks: blocksX * blocksY,
        inputSize: b64.length,
        note: 'Base64 image parsed. Actual pixelation requires image processing library (e.g. sharp, jimp).',
      });
    } catch (e) {
      logger.error(`PixelateTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = PixelateTool;
