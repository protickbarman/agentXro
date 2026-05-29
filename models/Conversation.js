const { mongoose } = require('../config/mongodb');
const { v4: uuidv4 } = require('uuid');

const schema = new mongoose.Schema({
  _id:         { type: String, default: uuidv4 },
  user_id:     { type: String, required: true, index: true },
  title:       { type: String, default: 'New Conversation' },
  description: { type: String, default: null },
  metadata:    { type: mongoose.Schema.Types.Mixed, default: {} },
  is_archived: { type: Boolean, default: false },
  created_at:  { type: Date, default: Date.now },
  updated_at:  { type: Date, default: Date.now },
}, { _id: false, versionKey: false });

schema.index({ user_id: 1, updated_at: -1 });

const Model = mongoose.models.Conversation
  || mongoose.model('Conversation', schema, 'conversations');

function row(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  o.id = o._id;
  return o;
}

class Conversation {
  /* id is now required — always pass the ID that the route already sent to the client */
  static async create(userId, title, description = null, id = null) {
    const _id = id || uuidv4();
    const now = new Date();
    /* upsert so duplicate queue retries are idempotent */
    const doc = await Model.findOneAndUpdate(
      { _id },
      { $setOnInsert: { _id, user_id: userId, title: title || 'New Conversation', description, created_at: now, updated_at: now } },
      { upsert: true, new: true, lean: true }
    );
    return doc ? { ...doc, id: doc._id } : { _id, id: _id, user_id: userId, title };
  }

  static async findById(id) {
    const doc = await Model.findById(id).lean();
    if (!doc) return null;
    return { ...doc, id: doc._id };
  }

  static async findByUserIdPaginated(userId, limit = 20, offset = 0) {
    const docs = await Model
      .find({ user_id: userId, is_archived: false })
      .sort({ updated_at: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
    return docs.map(d => ({ ...d, id: d._id }));
  }

  static async updateTitle(id, title) {
    await Model.findByIdAndUpdate(id, { title, updated_at: new Date() });
  }

  static async updateMetadata(id, metadata) {
    await Model.findByIdAndUpdate(id, { metadata, updated_at: new Date() });
  }

  static async archive(id) {
    await Model.findByIdAndUpdate(id, { is_archived: true, updated_at: new Date() });
  }

  static async delete(id) {
    await Model.findByIdAndDelete(id);
  }
}

module.exports = Conversation;
