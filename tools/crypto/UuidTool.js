const Tool = require('../base/Tool');
const crypto = require('crypto');
const logger = require('../../config/logger');

class UuidTool extends Tool {
  constructor() {
    super('uuid', {
      description: 'Generate UUID v4 or v7',
      parameters: {
        type: 'object',
        properties: {
          version: { type: 'string', enum: ['v4', 'v7'], description: 'UUID version' },
          count: { type: 'number', description: 'Number of UUIDs to generate' },
        },
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    return true;
  }

  _uuidV4() {
    return crypto.randomUUID();
  }

  _uuidV7() {
    const now = Date.now();
    const bytes = crypto.randomBytes(16);
    bytes[0] = (now >> 24) & 0xff;
    bytes[1] = (now >> 16) & 0xff;
    bytes[2] = (now >> 8) & 0xff;
    bytes[3] = now & 0xff;
    bytes[4] = (bytes[4] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { version = 'v4', count = 1 } = params;
      const generator = version === 'v4' ? this._uuidV4 : this._uuidV7;
      const uuids = [];
      for (let i = 0; i < count; i++) {
        uuids.push(generator.call(this));
      }
      return { version, count, uuids: count === 1 ? uuids[0] : uuids };
    } catch (e) {
      logger.error(`UuidTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = UuidTool;
