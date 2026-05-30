const { mongoose } = require('../config/mongodb');
const { v4: uuidv4 } = require('uuid');

const schema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  user_id: { type: String, required: true, index: true },
  refresh_token: { type: String, required: true },
  expires_at: { type: Date, required: true, index: true },
  created_at: { type: Date, default: Date.now },
  is_revoked: { type: Boolean, default: false },
}, { _id: false, versionKey: false });

schema.index({ user_id: 1, is_revoked: 1 });

const Model = mongoose.models.Session || mongoose.model('Session', schema, 'sessions');

function row(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  o.id = o._id;
  return o;
}

class Session {
  static async create(userId, refreshToken, expiresAt) {
    const id = uuidv4();
    const doc = await Model.create({
      _id: id,
      user_id: userId,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      created_at: new Date(),
    });
    return { id: doc._id, user_id: doc.user_id, expires_at: doc.expires_at, created_at: doc.created_at };
  }

  static async findById(id) {
    const doc = await Model.findOne({ _id: id, is_revoked: false }).lean();
    if (!doc) return null;
    return row(doc);
  }

  static async findByRefreshToken(token) {
    const doc = await Model.findOne({
      refresh_token: token,
      is_revoked: false,
      expires_at: { $gt: new Date() }
    }).lean();
    if (!doc) return null;
    return row(doc);
  }

  static async findByUserId(userId) {
    const docs = await Model
      .find({ user_id: userId, is_revoked: false })
      .sort({ created_at: -1 })
      .lean();
    return docs.map(d => ({ ...d, id: d._id }));
  }

  static async revoke(id) {
    await Model.findByIdAndUpdate(id, { is_revoked: true });
  }

  static async revokeAllByUser(userId) {
    await Model.updateMany({ user_id: userId }, { $set: { is_revoked: true } });
  }

  static async deleteExpired() {
    const result = await Model.deleteMany({ expires_at: { $lt: new Date() } });
    return result.deletedCount;
  }
}

module.exports = Session;