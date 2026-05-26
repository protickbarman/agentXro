const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const File = require('../../models/File');

class FileListTool extends Tool {
  constructor() {
    super('file_list', {
      description: 'List all saved files in the current conversation. Use this when the user asks "what files do I have?" or wants to browse their files.',
      parameters: {
        type: 'object',
        properties: {
          conversationId: { type: 'string', description: 'Conversation ID to list files for' },
        },
        required: ['conversationId'],
      },
    });
  }

  validate(p) {
    if (!p.conversationId) throw new Error('conversationId is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const { conversationId } = p;

      const files = await File.findByConversation(conversationId);

      return this.formatResult({
        count: files.length,
        files: files.map(f => ({
          id: f.id,
          filename: f.filename,
          mime_type: f.mime_type,
          size_bytes: f.size_bytes,
          created_at: f.created_at,
          download_url: `/api/files/${f.id}/download`,
        })),
      });
    } catch (e) {
      logger.error(`FileListTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = FileListTool;
