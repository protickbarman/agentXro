const { mongoose } = require('../config/mongodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

const memorySchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  type: { type: String, default: 'semantic' },
  scope: { type: String, default: 'user' },
  memory_key: { type: String, required: true },
  content: { type: mongoose.Schema.Types.Mixed, default: {} },
  context: { type: mongoose.Schema.Types.Mixed, default: {} },
  importance: { type: Number, default: 5 },
  confidence: { type: Number, default: 0.5 },
  user_id: { type: String },
  conversation_id: { type: String },
  agent_name: { type: String },
  expires_at: { type: Date },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, { versionKey: false });

memorySchema.index({ memory_key: 1, user_id: 1 });
memorySchema.index({ user_id: 1, is_active: 1 });
memorySchema.index({ agent_name: 1 });

const Memory = mongoose.models.Memory || mongoose.model('Memory', memorySchema, 'agent_memories');

const consolidationLogSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  strategy: { type: String, required: true },
  memories_processed: { type: Number, default: 0 },
  memories_merged: { type: Number, default: 0 },
  memories_pruned: { type: Number, default: 0 },
  user_id: { type: String },
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

const ConsolidationLog = mongoose.models.ConsolidationLog
  || mongoose.model('ConsolidationLog', consolidationLogSchema, 'memory_consolidation_log');

class MemoryManager {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 60000;
    this.MAX_CONTEXT_MEMORIES = 10;
  }

  async store(memory) {
    const id = uuidv4();
    const {
      type = 'semantic', scope = 'user', key, content,
      context = {}, userId, conversationId, agentName,
      importance = 5, confidence = 0.5, expiresAt = null,
    } = memory;

    if (!key) throw new Error('Memory key is required');

    try {
      const existing = await Memory.findOne({ memory_key: key, user_id: userId });
      if (existing) {
        const doc = await Memory.findByIdAndUpdate(existing._id, {
          $set: {
            content: content,
            importance,
            confidence,
            context,
            updated_at: new Date(),
          }
        }, { new: true }).lean();

        this._invalidateCache(userId);
        return { id: doc._id, type, scope, memory_key: key, created_at: doc.created_at };
      }

      const doc = await Memory.create({
        _id: id, type, scope, memory_key: key, content,
        context, importance, confidence, user_id: userId,
        conversation_id: conversationId, agent_name: agentName, expires_at: expiresAt,
      });

      this._invalidateCache(userId);
      logger.info(`Memory stored: ${key} (${type}, importance: ${importance})`);
      return { id: doc._id, type, scope, memory_key: key, created_at: doc.created_at };
    } catch (err) {
      logger.error(`Failed to store memory: ${err.message}`);
      throw err;
    }
  }

  async get(key, options = {}) {
    const { userId, scope } = options;
    const filter = { memory_key: key, is_active: true };
    if (scope) filter.scope = scope;

    const doc = await Memory.findOne(filter).lean();
    return doc ? { ...doc, id: doc._id } : null;
  }

  async search(query, options = {}) {
    const {
      userId, scope, agentName, types,
      limit = 5, minConfidence = 0.3, minImportance = 1,
    } = options;

    const filter = { is_active: true };

    if (userId) {
      filter.$or = [{ user_id: userId }, { scope: 'global' }];
    }
    if (scope) filter.scope = scope;
    if (agentName) filter.agent_name = agentName;
    if (types && types.length > 0) filter.type = { $in: types };
    if (minConfidence) filter.confidence = { $gte: minConfidence };
    if (minImportance) filter.importance = { $gte: minImportance };

    const docs = await Memory
      .find(filter)
      .sort({ importance: -1, confidence: -1, updated_at: -1 })
      .limit(limit)
      .lean();

    return docs.map(d => ({ ...d, id: d._id }));
  }

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

  async update(id, updates) {
    const $set = { updated_at: new Date() };
    const allowed = ['content', 'importance', 'confidence', 'context'];

    for (const [key, value] of Object.entries(updates)) {
      if (allowed.includes(key)) {
        $set[key] = value;
      }
    }

    if (Object.keys($set).length === 1) return null;

    const doc = await Memory.findByIdAndUpdate(id, { $set }, { new: true }).lean();
    if (doc) {
      this._invalidateCache(doc.user_id);
    }

    return doc ? { ...doc, id: doc._id } : null;
  }

  async delete(id) {
    const doc = await Memory.findByIdAndUpdate(id, {
      $set: { is_active: false }
    }).lean();

    if (doc) {
      this._invalidateCache(doc.user_id);
    }
    return !!doc;
  }

  async getByUser(userId, options = {}) {
    const { types, limit = 50 } = options;

    const filter = { user_id: userId, is_active: true };
    if (types?.length) filter.type = { $in: types };

    const docs = await Memory
      .find(filter)
      .sort({ importance: -1, updated_at: -1 })
      .limit(limit)
      .lean();

    return docs.map(d => ({ ...d, id: d._id }));
  }

  async consolidate(options = {}) {
    const { userId, strategy = 'prune', minImportance = 3 } = options;
    let processed = 0, merged = 0, pruned = 0;

    if (strategy === 'prune' || strategy === 'all') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await Memory.updateMany(
        { user_id: userId, is_active: true, importance: { $lt: minImportance }, updated_at: { $lt: thirtyDaysAgo } },
        { $set: { is_active: false, updated_at: new Date() } }
      );
      pruned = result.modifiedCount || 0;
    }

    if ((strategy === 'merge-related' || strategy === 'all') && userId) {
      merged = await this._mergeRelated(userId);
    }

    this._invalidateCache(userId);

    await ConsolidationLog.create({
      strategy,
      memories_processed: processed,
      memories_merged: merged,
      memories_pruned: pruned,
      user_id: userId,
    });

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
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
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