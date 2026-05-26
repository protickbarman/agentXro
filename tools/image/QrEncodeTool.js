const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class QrEncodeTool extends Tool {
  constructor() {
    super('qr_encode', {
      description: 'Generate a QR code as a data URL using an external API',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Data to encode in QR code' },
          size: { type: 'number', description: 'QR code size in pixels' },
        },
        required: ['data'],
      },
    });
    this.timeout = 10000;
  }

  validate(p) {
    if (!p.data || typeof p.data !== 'string') throw new Error('data is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const size = p.size || 300;
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(p.data)}`;
      const res = await axios.get(url, { timeout: this.timeout, responseType: 'arraybuffer' });
      const base64 = Buffer.from(res.data).toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;
      return this.formatResult({ dataUrl, size, format: 'PNG', encodedData: p.data });
    } catch (e) {
      logger.error(`QrEncodeTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = QrEncodeTool;
