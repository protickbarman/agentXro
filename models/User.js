const { mongoose } = require('../config/mongodb');
const { v4: uuidv4 } = require('uuid');

const schema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  email: { type: String, required: true, unique: true, index: true },
  password_hash: { type: String, required: true },
  username: { type: String, default: null },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, { _id: false, versionKey: false });

const Model = mongoose.models.User || mongoose.model('User', schema, 'users');

function row(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  o.id = o._id;
  return o;
}

class User {
  static async create(email, passwordHash, username) {
    const id = uuidv4();
    const now = new Date();
    try {
      const doc = await Model.create({
        _id: id,
        email,
        password_hash: passwordHash,
        username,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
      return { id: doc._id, email: doc.email, username: doc.username, created_at: doc.created_at };
    } catch (err) {
      if (err.code === 11000) throw new Error('Email already registered');
      throw err;
    }
  }

  static async findById(id) {
    const doc = await Model.findById(id).lean();
    if (!doc) return null;
    const result = { ...doc, id: doc._id };
    delete result.password_hash;
    return result;
  }

  static async findByEmail(email) {
    const doc = await Model.findOne({ email }).lean();
    if (!doc) return null;
    return { ...doc, id: doc._id };
  }

  static async updateLastActive(userId) {
    await Model.findByIdAndUpdate(userId, { updated_at: new Date() });
  }

  static async updatePassword(userId, newPasswordHash) {
    await Model.findByIdAndUpdate(userId, { password_hash: newPasswordHash, updated_at: new Date() });
  }

  static async update(userId, updates) {
    const allowedFields = ['username', 'email'];
    const $set = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        $set[key] = value;
      }
    }

    if (Object.keys($set).length === 0) return null;

    $set.updated_at = new Date();
    const doc = await Model.findByIdAndUpdate(userId, { $set }, { new: true }).lean();
    if (!doc) return null;
    return { id: doc._id, email: doc.email, username: doc.username, created_at: doc.created_at, updated_at: doc.updated_at, is_active: doc.is_active };
  }

  static async deactivate(userId) {
    await Model.findByIdAndUpdate(userId, { is_active: false });
  }
}

module.exports = User;