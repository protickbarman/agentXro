const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

class FileHashTool extends Tool {
  constructor() {
    super('file_hash', {
      description: 'Compute hash of a file using crypto module',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to file' },
          algorithm: { type: 'string', description: 'Hash algorithm (md5, sha1, sha256, sha512)' },
        },
        required: ['path'],
      },
    });
  }

  validate(p) {
    if (!p.path || typeof p.path !== 'string') throw new Error('path is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const algorithm = p.algorithm || 'sha256';
      const resolved = path.resolve(p.path);
      const stat = await fs.promises.stat(resolved);

      const hash = await new Promise((resolve, reject) => {
        const h = crypto.createHash(algorithm);
        const stream = fs.createReadStream(resolved);
        stream.on('data', d => h.update(d));
        stream.on('end', () => resolve(h.digest('hex')));
        stream.on('error', reject);
      });

      return this.formatResult({ path: resolved, algorithm, hash, fileSize: stat.size });
    } catch (e) {
      logger.error(`FileHashTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = FileHashTool;
