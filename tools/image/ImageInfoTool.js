const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const fs = require('fs/promises');

class ImageInfoTool extends Tool {
  constructor() {
    super('image_info', {
      description: 'Get image dimensions and format from base64 data or file path',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Base64 encoded image data or file path' },
          format: { type: 'string', enum: ['base64', 'path'], description: 'Input format' },
        },
        required: ['data', 'format'],
      },
    });
  }

  validate(p) {
    if (!p.data || typeof p.data !== 'string') throw new Error('data is required');
    if (!['base64', 'path'].includes(p.format)) throw new Error('format must be "base64" or "path"');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      let buffer;
      if (p.format === 'path') {
        const stat = await fs.stat(p.data);
        buffer = await fs.readFile(p.data);
        const fileName = p.data.split('/').pop() || p.data;
        const ext = fileName.includes('.') ? '.' + fileName.split('.').pop().toLowerCase() : '';
        const info = this._parseHeader(buffer);
        return this.formatResult({ ...info, fileSize: stat.size, fileName, extension: ext });
      }
      const b64 = p.data.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(b64, 'base64');
      const info = this._parseHeader(buffer);
      return this.formatResult({ ...info, dataSize: b64.length });
    } catch (e) {
      logger.error(`ImageInfoTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }

  _parseHeader(buf) {
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
      return { format: 'PNG', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf[25] };
    }
    if (buf[0] === 0xFF && buf[1] === 0xD8) {
      let offset = 2;
      while (offset < buf.length) {
        if (buf[offset] !== 0xFF) break;
        const marker = buf[offset + 1];
        if (marker === 0xC0 || marker === 0xC2) {
          const h = buf.readUInt16BE(offset + 5);
          const w = buf.readUInt16BE(offset + 7);
          return { format: 'JPEG', width: w, height: h };
        }
        const len = buf.readUInt16BE(offset + 2);
        offset += len + 2;
      }
      return { format: 'JPEG', width: 0, height: 0 };
    }
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
      const w = buf.readUInt16LE(6);
      const h = buf.readUInt16LE(8);
      return { format: 'GIF', width: w, height: h };
    }
    if (buf[0] === 0x42 && buf[1] === 0x4D) {
      const w = buf.readUInt32LE(18);
      const h = buf.readUInt32LE(22);
      return { format: 'BMP', width: w, height: h };
    }
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
      return { format: 'WEBP', width: 0, height: 0 };
    }
    return { format: 'Unknown', width: 0, height: 0 };
  }
}

module.exports = ImageInfoTool;
