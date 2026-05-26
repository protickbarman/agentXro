const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const fs = require('fs/promises');
const path = require('path');

class ReadFileTool extends Tool {
  constructor() {
    super('read_file', {
      description: 'Read file content from the filesystem',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to file' },
          encoding: { type: 'string', description: 'File encoding (default: utf8)' },
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
      const encoding = p.encoding || 'utf8';
      const content = await fs.readFile(p.path, encoding);
      const stat = await fs.stat(p.path);
      return this.formatResult({ content, size: content.length, path: path.resolve(p.path), encoding, modified: stat.mtime });
    } catch (e) {
      logger.error(`ReadFileTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = ReadFileTool;
