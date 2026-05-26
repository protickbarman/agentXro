const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const fs = require('fs/promises');
const path = require('path');

class DeleteFileTool extends Tool {
  constructor() {
    super('delete_file', {
      description: 'Delete a file or directory',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to file or directory to delete' },
          recursive: { type: 'boolean', description: 'Recursively delete directory contents' },
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
      await fs.rm(resolved, { recursive: p.recursive || false, force: true });
      return this.formatResult({ path: resolved, deleted: true, recursive: !!p.recursive });
    } catch (e) {
      logger.error(`DeleteFileTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = DeleteFileTool;
