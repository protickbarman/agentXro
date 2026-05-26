const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const fs = require('fs/promises');
const path = require('path');

class WriteFileTool extends Tool {
  constructor() {
    super('write_file', {
      description: 'Write content to a file on the filesystem',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to file' },
          content: { type: 'string', description: 'Content to write' },
          encoding: { type: 'string', description: 'File encoding (default: utf8)' },
        },
        required: ['path', 'content'],
      },
    });
  }

  validate(p) {
    if (!p.path || typeof p.path !== 'string') throw new Error('path is required');
    if (p.content === undefined) throw new Error('content is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const encoding = p.encoding || 'utf8';
      const resolved = path.resolve(p.path);
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, p.content, encoding);
      return this.formatResult({ path: resolved, size: p.content.length, encoding });
    } catch (e) {
      logger.error(`WriteFileTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = WriteFileTool;
