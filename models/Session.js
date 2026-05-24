const { query, getOne, getMany } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Session {
  static async create(userId, refreshToken, expiresAt) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO sessions (id, user_id, refresh_token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, user_id, expires_at, created_at`,
      [id, userId, refreshToken, expiresAt]
    );
    return result.rows[0];
  }

  static async findById(id) {
    return getOne(
      `SELECT id, user_id, refresh_token, expires_at, created_at, is_revoked
       FROM sessions WHERE id = $1 AND is_revoked = false`,
      [id]
    );
  }

  static async findByRefreshToken(token) {
    return getOne(
      `SELECT id, user_id, refresh_token, expires_at
       FROM sessions WHERE refresh_token = $1 AND is_revoked = false AND expires_at > NOW()`,
      [token]
    );
  }

  static async findByUserId(userId) {
    return getMany(
      `SELECT id, expires_at, created_at, is_revoked
       FROM sessions WHERE user_id = $1 AND is_revoked = false
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  static async revoke(id) {
    await query('UPDATE sessions SET is_revoked = true WHERE id = $1', [id]);
  }

  static async revokeAllByUser(userId) {
    await query('UPDATE sessions SET is_revoked = true WHERE user_id = $1', [userId]);
  }

  static async deleteExpired() {
    return await query('DELETE FROM sessions WHERE expires_at < NOW()');
  }
}

module.exports = Session;
