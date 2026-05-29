const { mongoose } = require('../config/mongodb');
const { v4: uuidv4 } = require('uuid');

const schema = new mongoose.Schema({
  _id:             { type: String, default: uuidv4 },
  user_id:         { type: String, required: true, index: true },
  conversation_id: { type: String, index: true },
  filename:        { type: String, required: true },
  mime_type:       { type: String, default: 'application/octet-stream' },
  size_bytes:      { type: Number, default: 0 },
  storage_path:    { type: String, required: true },
  created_at:      { type: Date, default: Date.now },
}, { _id: false, versionKey: false });

schema.index({ conversation_id: 1, created_at: -1 });

const Model = mongoose.models.File
  || mongoose.model('File', schema, 'files');

function row(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  o.id = o._id;
  return o;
}

class File {
  static async create(userId, conversationId, filename, mimeType, sizeBytes, storagePath) {
    const id = uuidv4();
    const doc = await Model.create({
      _id: id, user_id: userId, conversation_id: conversationId,
      filename, mime_type: mimeType, size_bytes: sizeBytes,
      storage_path: storagePath, created_at: new Date(),
    });
    return row(doc);
  }

  static async findById(id) {
    const doc = await Model.findById(id).lean();
    if (!doc) return null;
    return { ...doc, id: doc._id };
  }

  static async findByConversation(conversationId) {
    const docs = await Model
      .find({ conversation_id: conversationId })
      .sort({ created_at: -1 })
      .select('_id filename mime_type size_bytes created_at')
      .lean();
    return docs.map(d => ({ ...d, id: d._id }));
  }

  static async findByUser(userId) {
    const docs = await Model
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .select('_id filename mime_type size_bytes conversation_id created_at')
      .lean();
    return docs.map(d => ({ ...d, id: d._id }));
  }

  static async delete(id) {
    const doc = await Model.findById(id).lean();
    if (!doc) return null;
    await Model.findByIdAndDelete(id);
    return { ...doc, id: doc._id };
  }
}

module.exports = File;
