const { query, getOne, getMany } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Conversation {
  static async create(userId, title, description = null) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO conversations (id, user_id, title, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, title, description, created_at, updated_at`,
      [id, userId, title, description]
    );
    return result.rows[0];
  }

  static async findById(id) {
    return getOne(
      `SELECT id, user_id, title, description, metadata, created_at, updated_at, is_archived
       FROM conversations WHERE id = $1`,
      [id]
    );
  }

  static async findByUserIdPaginated(userId, limit = 20, offset = 0) {
    return getMany(
      `SELECT id, title, description, created_at, updated_at, is_archived
       FROM conversations WHERE user_id = $1 AND is_archived = false
       ORDER BY updated_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }

  static async updateTitle(id, title) {
    await query('UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2', [title, id]);
  }

  static async archive(id) {
    await query('UPDATE conversations SET is_archived = true, updated_at = NOW() WHERE id = $1', [id]);
  }

  static async delete(id) {
    await query('DELETE FROM conversations WHERE id = $1', [id]);
  }
}

module.exports = Conversation;
