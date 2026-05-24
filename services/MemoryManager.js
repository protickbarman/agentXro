const { query, getOne, getMany } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * MemoryManager - Persistent agent memory system
 * Part of Agent Memory System skill
 */
class MemoryManager {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 60000; // 1 minute
    this.MAX_CONTEXT_MEMORIES = 10;
  }

  /**
   * Store a memory
   * @param {object} memory - Memory object
   * @returns {Promise<object>}
   */
  async store(memory) {
    const id = uuidv4();
    const {
      type = 'semantic', scope = 'user', key, content,
      context = {}, userId, conversationId, agentName,
      importance = 5, confidence = 0.5, expiresAt = null,
    } = memory;

    if (!key) throw new Error('Memory key is required');

    const result = await query(
      `INSERT INTO agent_memories (id, type, scope, memory_key, content, context, 
        importance, confidence, user_id, conversation_id, agent_name, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (memory_key, user_id) WHERE scope = 'user' 
       DO UPDATE SET content = $5, importance = $7, confidence = $8, updated_at = NOW()
       RETURNING id, type, scope, memory_key, created_at`,
      [id, type, scope, key, JSON.stringify(content), JSON.stringify(context),
       importance, confidence, userId, conversationId, agentName, expiresAt]
    );

    this._invalidateCache(userId);
    logger.info(`Memory stored: ${key} (${type}, importance: ${importance})`);
    return result.rows[0];
  }

  /**
   * Get a memory by key
   * @param {string} key - Memory key
   * @param {object} options - Query options
   * @returns {Promise<object|null>}
   */
  async get(key, options = {}) {
    const { userId, scope } = options;
    let sql = 'SELECT * FROM agent_memories WHERE memory_key = $1 AND is_active = true';
    const params = [key];

    if (scope) {
      sql += ' AND scope = $2';
      params.push(scope);
    }

    const result = await query(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Search memories semantically
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<Array>}
   */
  async search(query, options = {}) {
    const {
      userId, scope, agentName, types, categories,
      limit = 5, minConfidence = 0.3, minImportance = 1,
    } = options;

    let sql = 'SELECT * FROM agent_memories WHERE is_active = true';
    const params = [];
    let paramIdx = 1;

    if (userId) {
      sql += ` AND (user_id = $${paramIdx} OR scope = 'global')`;
      params.push(userId);
      paramIdx++;
    }
    if (scope) {
      sql += ` AND scope = $${paramIdx}`;
      params.push(scope);
      paramIdx++;
    }
    if (agentName) {
      sql += ` AND agent_name = $${paramIdx}`;
      params.push(agentName);
      paramIdx++;
    }
    if (types && types.length > 0) {
      sql += ` AND type = ANY($${paramIdx})`;
      params.push(types);
      paramIdx++;
    }
    if (minConfidence) {
      sql += ` AND confidence >= $${paramIdx}`;
      params.push(minConfidence);
      paramIdx++;
    }
    if (minImportance) {
      sql += ` AND importance >= $${paramIdx}`;
      params.push(minImportance);
      paramIdx++;
    }

    sql += ' ORDER BY importance DESC, confidence DESC, updated_at DESC LIMIT $' + paramIdx;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get context for agent execution
   * @param {string} userId - User ID
   * @param {object} options - Context options
   * @returns {Promise<Array>}
   */
  async getContext(userId, options = {}) {
    const cacheKey = `context:${userId}:${JSON.stringify(options)}`;
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    const { query: searchQuery, agentName, limit = this.MAX_CONTEXT_MEMORIES } = options;

    const memories = await this.search(searchQuery || '', {
      userId,
      agentName,
      types: ['semantic', 'procedural', 'episodic'],
      limit,
      minConfidence: 0.4,
      minImportance: 3,
    });

    this._setCache(cacheKey, memories);
    return memories;
  }

  /**
   * Update a memory
   * @param {string} id - Memory ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>}
   */
  async update(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (['content', 'importance', 'confidence', 'context'].includes(key)) {
        fields.push(`${key} = $${idx}`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        idx++;
      }
    }

    if (fields.length === 0) return null;

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `UPDATE agent_memories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows[0]) {
      this._invalidateCache(result.rows[0].user_id);
    }

    return result.rows[0];
  }

  /**
   * Delete a memory
   * @param {string} id - Memory ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const result = await query(
      'UPDATE agent_memories SET is_active = false WHERE id = $1 RETURNING user_id',
      [id]
    );
    if (result.rows[0]) {
      this._invalidateCache(result.rows[0].user_id);
    }
    return result.rowCount > 0;
  }

  /**
   * Get all memories for a user
   * @param {string} userId - User ID
   * @param {object} options - Filter options
   * @returns {Promise<Array>}
   */
  async getByUser(userId, options = {}) {
    const { types, categories, limit = 50 } = options;
    let sql = 'SELECT * FROM agent_memories WHERE user_id = $1 AND is_active = true';
    const params = [userId];
    let idx = 2;

    if (types?.length) {
      sql += ` AND type = ANY($${idx})`;
      params.push(types);
      idx++;
    }

    sql += ' ORDER BY importance DESC, updated_at DESC LIMIT $' + idx;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Consolidate memories for a user
   * @param {object} options - Consolidation options
   * @returns {Promise<object>}
   */
  async consolidate(options = {}) {
    const { userId, strategy = 'prune', minImportance = 3 } = options;
    let processed = 0, merged = 0, pruned = 0;

    if (strategy === 'prune' || strategy === 'all') {
      const result = await query(
        `UPDATE agent_memories SET is_active = false 
         WHERE user_id = $1 AND is_active = true 
         AND importance < $2 AND updated_at < NOW() - INTERVAL '30 days'`,
        [userId, minImportance]
      );
      pruned = result.rowCount;
    }

    if ((strategy === 'merge-related' || strategy === 'all') && userId) {
      const result = await this._mergeRelated(userId);
      merged = result;
    }

    this._invalidateCache(userId);

    await query(
      `INSERT INTO memory_consolidation_log (strategy, memories_processed, memories_merged, memories_pruned, user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [strategy, processed, merged, pruned, userId]
    );

    logger.info(`Memory consolidation: ${strategy} - processed=${processed}, merged=${merged}, pruned=${pruned}`);
    return { strategy, processed, merged, pruned };
  }

  async _mergeRelated(userId) {
    const memories = await this.getByUser(userId, { limit: 100 });
    let merged = 0;

    const groups = new Map();
    for (const mem of memories) {
      const category = mem.content?.metadata?.category || 'uncategorized';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(mem);
    }

    for (const [, group] of groups) {
      if (group.length < 3) continue;
      const lowImp = group.filter(m => m.importance < 5);
      if (lowImp.length < 2) continue;

      const combined = {
        text: lowImp.map(m => m.content?.text).filter(Boolean).join('; '),
        metadata: { category: lowImp[0]?.content?.metadata?.category, merged: true },
      };

      const keep = lowImp[0];
      await this.update(keep.id, { content: combined, importance: Math.min(6, keep.importance + 1) });

      for (const mem of lowImp.slice(1)) {
        await this.delete(mem.id);
        merged++;
      }
    }

    return merged;
  }

  _getCache(key) {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
      return entry.data;
    }
    return null;
  }

  _setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
    if (this.cache.size > 100) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
  }

  _invalidateCache(userId) {
    for (const [key] of this.cache) {
      if (key.includes(userId)) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = new MemoryManager();
