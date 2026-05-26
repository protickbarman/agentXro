const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const fs = require('fs/promises');
const File = require('../../models/File');

class FileReadContentTool extends Tool {
  constructor() {
    super('file_read_content', {
      description: 'Read the content of a previously saved file by its ID. Use this when the user asks to view, read, or check a file that was created earlier.',
      parameters: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'The ID of the file to read' },
        },
        required: ['fileId'],
      },
    });
  }

  validate(p) {
    if (!p.fileId || typeof p.fileId !== 'string') throw new Error('fileId is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const { fileId, _userId } = p;

      const file = await File.findById(fileId);
      if (!file) return this.formatError(new Error('File not found'));
      if (file.user_id !== _userId) return this.formatError(new Error('File not found'));

      const exists = await fs.stat(file.storage_path).then(() => true).catch(() => false);
      if (!exists) return this.formatError(new Error('File not found on disk'));

      const content = await fs.readFile(file.storage_path, 'utf8');

      return this.formatResult({
        id: file.id,
        filename: file.filename,
        content,
        size_bytes: file.size_bytes,
        mime_type: file.mime_type,
        created_at: file.created_at,
      });
    } catch (e) {
      logger.error(`FileReadContentTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = FileReadContentTool;
