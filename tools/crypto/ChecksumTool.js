const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class ChecksumTool extends Tool {
  constructor() {
    super('checksum', {
      description: 'CRC32, Adler-32, XOR, sum of bytes checksums',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'Value to checksum' },
          algorithm: { type: 'string', enum: ['crc32', 'adler32', 'xor', 'sum'], description: 'Checksum algorithm' },
        },
        required: ['value'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.value && params.value !== '') throw new Error('value required');
    return true;
  }

  _crc32(str) {
    let crc = 0xffffffff;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        const b = (ch >> (7 - j)) & 1;
        crc = ((crc << 1) ^ ((crc >> 31) & 1 ? 0xedb88320 : 0)) ^ b;
        crc >>>= 0;
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  _adler32(str) {
    let a = 1;
    let b = 0;
    for (let i = 0; i < str.length; i++) {
      a = (a + str.charCodeAt(i)) % 65521;
      b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
  }

  _xor(str) {
    let result = 0;
    for (let i = 0; i < str.length; i++) {
      result ^= str.charCodeAt(i);
    }
    return result;
  }

  _sum(str) {
    let total = 0;
    for (let i = 0; i < str.length; i++) {
      total += str.charCodeAt(i);
    }
    return total;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, algorithm = 'crc32' } = params;
      let checksum;

      switch (algorithm) {
        case 'crc32': checksum = this._crc32(value); break;
        case 'adler32': checksum = this._adler32(value); break;
        case 'xor': checksum = this._xor(value); break;
        case 'sum': checksum = this._sum(value); break;
        default: throw new Error(`Unknown algorithm: ${algorithm}`);
      }

      return { value, algorithm, checksum };
    } catch (e) {
      logger.error(`ChecksumTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = ChecksumTool;
