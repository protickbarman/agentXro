const { query, getOne, getMany } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class User {
  static async create(email, passwordHash, username) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO users (id, email, password_hash, username, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, email, username, created_at`,
      [id, email, passwordHash, username]
    );
    return result.rows[0];
  }

  static async findById(id) {
    return getOne('SELECT id, email, username, created_at, updated_at, is_active FROM users WHERE id = $1', [id]);
  }

  static async findByEmail(email) {
    return getOne('SELECT * FROM users WHERE email = $1', [email]);
  }

  static async updateLastActive(userId) {
    return query('UPDATE users SET updated_at = NOW() WHERE id = $1', [userId]);
  }

  static async updatePassword(userId, newPasswordHash) {
    return query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );
  }

  static async update(userId, updates) {
    const allowedFields = ['username', 'email'];
    const fields = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index++;
      }
    }

    if (fields.length === 0) {
      return null;
    }

    fields.push('updated_at = NOW()');
    values.push(userId);

    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${index}
       RETURNING id, email, username, created_at, updated_at, is_active`,
      values
    );
    return result.rows[0];
  }

  static async deactivate(userId) {
    return query('UPDATE users SET is_active = false WHERE id = $1', [userId]);
  }
}

module.exports = User;
