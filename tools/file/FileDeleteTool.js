const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const fs = require('fs/promises');
const File = require('../../models/File');

class FileDeleteTool extends Tool {
  constructor() {
    super('file_delete', {
      description: 'Delete a previously saved file by its ID. Removes it from disk and database. Use this when the user asks to delete or remove a file.',
      parameters: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'The ID of the file to delete' },
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

      await fs.unlink(file.storage_path).catch(() => {});
      await File.delete(fileId);

      logger.info('FileDeleteTool: file deleted', { fileId, userId: _userId });

      return this.formatResult({ deleted: true, filename: file.filename, id: fileId });
    } catch (e) {
      logger.error(`FileDeleteTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = FileDeleteTool;
