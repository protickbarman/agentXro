const { mongoose } = require('../config/mongodb');
const { v4: uuidv4 } = require('uuid');

const schema = new mongoose.Schema({
  _id:              { type: String, default: uuidv4 },
  message_id:       { type: String, index: true },
  conversation_id:  { type: String, index: true },
  tool_name:        { type: String, required: true },
  tool_type:        { type: String, default: null },
  input:            { type: mongoose.Schema.Types.Mixed, default: {} },
  output:           { type: mongoose.Schema.Types.Mixed, default: null },
  status:           { type: String, default: 'pending' },
  error_message:    { type: String, default: null },
  retry_count:      { type: Number, default: 0 },
  execution_time_ms:{ type: Number, default: 0 },
  duration_ms:      { type: Number, default: 0 },
  created_at:       { type: Date, default: Date.now },
  completed_at:     { type: Date, default: null },
}, { _id: false, versionKey: false });

const Model = mongoose.models.ToolExecution
  || mongoose.model('ToolExecution', schema, 'tool_executions');

function row(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  o.id = o._id;
  return o;
}

class ToolExecution {
  static async create(messageId, toolName, input, status = 'pending', toolType = null) {
    const id = uuidv4();
    const doc = await Model.create({
      _id: id, message_id: messageId, tool_name: toolName,
      tool_type: toolType, input: input || {},
      status, retry_count: 0, created_at: new Date(),
    });
    return row(doc);
  }

  static async update(id, { output, status, executionTime, errorMessage, retryCount }) {
    const upd = { completed_at: new Date() };
    if (output !== undefined)        upd.output = output;
    if (status !== undefined)        upd.status = status;
    if (executionTime !== undefined) upd.execution_time_ms = executionTime;
    if (errorMessage !== undefined)  upd.error_message = errorMessage;
    if (retryCount !== undefined)    upd.retry_count = retryCount;
    const doc = await Model.findByIdAndUpdate(id, upd, { new: true });
    return row(doc);
  }

  static async findById(id) {
    const doc = await Model.findById(id).lean();
    if (!doc) return null;
    return { ...doc, id: doc._id };
  }

  static async findByMessageId(messageId) {
    const docs = await Model
      .find({ message_id: messageId })
      .sort({ created_at: -1 })
      .lean();
    return docs.map(d => ({ ...d, id: d._id }));
  }
}

module.exports = ToolExecution;
