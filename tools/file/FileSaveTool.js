const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const path = require('path');
const fs = require('fs/promises');
const File = require('../../models/File');

class FileSaveTool extends Tool {
  constructor() {
    super('file_save', {
      description: 'Save content to a managed file on the server. The file is stored persistently and associated with the current conversation. Use this when the user asks to create, save, or write a file. The filename should be derived from the user\'s request.',
      parameters: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Filename including extension, derived from user request (e.g., "script.py", "notes.md", "data.json")' },
          content: { type: 'string', description: 'File content to write' },
          mimeType: { type: 'string', description: 'Optional MIME type (auto-detected if omitted)' },
        },
        required: ['filename', 'content'],
      },
    });
  }

  validate(p) {
    if (!p.filename || typeof p.filename !== 'string') throw new Error('filename is required');
    if (p.content === undefined) throw new Error('content is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const { filename, content, _userId, _conversationId } = p;

      const storageDir = path.join(__dirname, '..', '..', 'storage', 'files', _userId, _conversationId || 'general');
      await fs.mkdir(storageDir, { recursive: true });

      const storagePath = path.join(storageDir, filename);
      await fs.writeFile(storagePath, content, 'utf8');

      const stat = await fs.stat(storagePath);
      const mimeType = p.mimeType || (require('mime-types').lookup(filename) || 'application/octet-stream');

      const file = await File.create(_userId, _conversationId || null, filename, mimeType, stat.size, storagePath);

      logger.info('FileSaveTool: file saved', { fileId: file.id, filename, userId: _userId });

      return this.formatResult({
        id: file.id,
        filename: file.filename,
        mime_type: file.mime_type,
        size_bytes: file.size_bytes,
        created_at: file.created_at,
        download_url: `/api/files/${file.id}/download`,
      });
    } catch (e) {
      logger.error(`FileSaveTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = FileSaveTool;
