const { mongoose } = require('../config/mongodb');
const { v4: uuidv4 } = require('uuid');

const schema = new mongoose.Schema({
  _id:             { type: String, default: uuidv4 },
  conversation_id: { type: String, required: true, index: true },
  role:            { type: String, required: true },
  content:         { type: String, default: '' },
  metadata:        { type: mongoose.Schema.Types.Mixed, default: {} },
  reasoning_steps: { type: mongoose.Schema.Types.Mixed, default: [] },
  tool_calls:      { type: mongoose.Schema.Types.Mixed, default: [] },
  created_at:      { type: Date, default: Date.now },
  updated_at:      { type: Date, default: Date.now },
}, { _id: false, versionKey: false });

schema.index({ conversation_id: 1, created_at: 1 });

const Model = mongoose.models.Message
  || mongoose.model('Message', schema, 'messages');

function row(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  o.id = o._id;
  return o;
}

class Message {
  static async create(conversationId, role, content, metadata = {}, reasoningSteps = [], toolCalls = []) {
    const id = uuidv4();
    const now = new Date();
    const doc = await Model.create({
      _id: id, conversation_id: conversationId, role,
      content: content || '',
      metadata: metadata || {},
      reasoning_steps: reasoningSteps || [],
      tool_calls: toolCalls || [],
      created_at: now, updated_at: now,
    });
    return row(doc);
  }

  static async findById(id) {
    const doc = await Model.findById(id).lean();
    if (!doc) return null;
    return { ...doc, id: doc._id };
  }

  static async findByConversationIdPaginated(conversationId, limit = 50, offset = 0) {
    const docs = await Model
      .find({ conversation_id: conversationId })
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
    return docs.map(d => ({ ...d, id: d._id }));
  }

  static async getConversationHistory(conversationId, limit = 50) {
    const docs = await Model
      .find({ conversation_id: conversationId })
      .sort({ created_at: 1 })
      .limit(limit)
      .select('_id role content created_at')
      .lean();
    return docs.map(d => ({ ...d, id: d._id }));
  }

  static async delete(id) {
    await Model.findByIdAndDelete(id);
  }
}

module.exports = Message;
