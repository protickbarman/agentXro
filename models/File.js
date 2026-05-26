const { query, getOne, getMany } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class File {
  static async create(userId, conversationId, filename, mimeType, sizeBytes, storagePath) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO files (id, user_id, conversation_id, filename, mime_type, size_bytes, storage_path, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [id, userId, conversationId, filename, mimeType, sizeBytes, storagePath]
    );
    return result.rows[0];
  }

  static async findById(id) {
    return getOne('SELECT * FROM files WHERE id = $1', [id]);
  }

  static async findByConversation(conversationId) {
    return getMany(
      'SELECT id, filename, mime_type, size_bytes, created_at FROM files WHERE conversation_id = $1 ORDER BY created_at DESC',
      [conversationId]
    );
  }

  static async findByUser(userId) {
    return getMany(
      'SELECT id, filename, mime_type, size_bytes, conversation_id, created_at FROM files WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
  }

  static async delete(id) {
    const file = await this.findById(id);
    if (!file) return null;
    await query('DELETE FROM files WHERE id = $1', [id]);
    return file;
  }
}

module.exports = File;
