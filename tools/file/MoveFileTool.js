const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const fs = require('fs/promises');
const path = require('path');

class MoveFileTool extends Tool {
  constructor() {
    super('move_file', {
      description: 'Move or rename a file or directory',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source path' },
          dest: { type: 'string', description: 'Destination path' },
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
      await fs.rename(src, dst);
      return this.formatResult({ source: src, dest: dst });
    } catch (e) {
      logger.error(`MoveFileTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = MoveFileTool;
