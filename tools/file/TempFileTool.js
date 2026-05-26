const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const fs = require('fs/promises');
const path = require('path');

class TempFileTool extends Tool {
  constructor() {
    super('temp_file', {
      description: 'Create a temporary file in /tmp',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Content to write to temp file' },
          prefix: { type: 'string', description: 'File name prefix (default: tmp)' },
          suffix: { type: 'string', description: 'File extension (e.g. .txt)' },
        },
        required: ['content'],
      },
    });
  }

  validate(p) {
    if (p.content === undefined) throw new Error('content is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const tmpDir = await fs.mkdtemp(path.join('/tmp', p.prefix || 'tool-'));
      const fileName = `data${p.suffix || '.txt'}`;
      const filePath = path.join(tmpDir, fileName);
      await fs.writeFile(filePath, String(p.content));
      return this.formatResult({ path: filePath, dir: tmpDir, size: String(p.content).length });
    } catch (e) {
      logger.error(`TempFileTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = TempFileTool;
