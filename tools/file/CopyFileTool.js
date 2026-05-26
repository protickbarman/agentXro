const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const fs = require('fs/promises');
const path = require('path');

class CopyFileTool extends Tool {
  constructor() {
    super('copy_file', {
      description: 'Copy a file from source to destination',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source file path' },
          dest: { type: 'string', description: 'Destination file path' },
        },
        required: ['source', 'dest'],
      },
    });
  }

  validate(p) {
    if (!p.source || typeof p.source !== 'string') throw new Error('source is required');
    if (!p.dest || typeof p.dest !== 'string') throw new Error('dest is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const src = path.resolve(p.source);
      const dst = path.resolve(p.dest);
      await fs.mkdir(path.dirname(dst), { recursive: true });
      await fs.copyFile(src, dst);
      const stat = await fs.stat(dst);
      return this.formatResult({ source: src, dest: dst, size: stat.size });
    } catch (e) {
      logger.error(`CopyFileTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = CopyFileTool;
