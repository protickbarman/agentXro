const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');
const FormData = require('form-data');

class QrDecodeTool extends Tool {
  constructor() {
    super('qr_decode', {
      description: 'Decode a QR code from a base64 image using external API',
      parameters: {
        type: 'object',
        properties: {
          image: { type: 'string', description: 'Base64 encoded QR code image (with or without data: prefix)' },
        },
        required: ['image'],
      },
    });
    this.timeout = 15000;
  }

  validate(p) {
    if (!p.image || typeof p.image !== 'string') throw new Error('image is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      try {
        const b64 = p.image.replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(b64, 'base64');
        const fd = new FormData();
        fd.append('file', buf, { filename: 'qrcode.png', contentType: 'image/png' });
        const res = await axios.post('https://api.qrserver.com/v1/read-qr-code/', fd, {
          headers: fd.getHeaders(),
          timeout: this.timeout,
        });
        const data = res.data?.[0]?.symbol?.[0]?.data || '';
        return this.formatResult({ decoded: data, success: !!data });
      } catch {
        return this.formatResult({
          decoded: '',
          success: false,
          note: 'QR decoding via external API failed. Try using a local QR decoder library.',
        });
      }
    } catch (e) {
      logger.error(`QrDecodeTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = QrDecodeTool;
