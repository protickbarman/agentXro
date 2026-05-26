const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const fs = require('fs/promises');
const path = require('path');

class FileInfoTool extends Tool {
  constructor() {
    super('file_info', {
      description: 'Get file or directory metadata',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to file or directory' },
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
      const resolved = path.resolve(p.path);
      const stat = await fs.stat(resolved);
      return this.formatResult({
        path: resolved,
        name: path.basename(resolved),
        size: stat.size,
        created: stat.birthtime,
        modified: stat.mtime,
        accessed: stat.atime,
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        isSymbolicLink: stat.isSymbolicLink(),
        permissions: (stat.mode & parseInt('777', 8)).toString(8),
        mode: stat.mode.toString(8),
      });
    } catch (e) {
      logger.error(`FileInfoTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = FileInfoTool;
