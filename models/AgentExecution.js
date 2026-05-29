const { mongoose } = require('../config/mongodb');
const { v4: uuidv4 } = require('uuid');

const schema = new mongoose.Schema({
  _id:                  { type: String, default: uuidv4 },
  message_id:           { type: String, index: true },
  conversation_id:      { type: String, index: true },
  agent_name:           { type: String, required: true },
  agent_type:           { type: String, default: 'main' },
  input_query:          { type: String, default: '' },
  input:                { type: mongoose.Schema.Types.Mixed, default: {} },
  output_response:      { type: String, default: null },
  output:               { type: mongoose.Schema.Types.Mixed, default: null },
  status:               { type: String, default: 'processing' },
  complexity_level:     { type: String, default: null },
  decision_reason:      { type: String, default: null },
  sub_agents_involved:  { type: mongoose.Schema.Types.Mixed, default: [] },
  execution_time_ms:    { type: Number, default: 0 },
  duration_ms:          { type: Number, default: 0 },
  tokens_used:          { type: Number, default: 0 },
  llm_provider:         { type: String, default: null },
  error_message:        { type: String, default: null },
  parent_execution_id:  { type: String, default: null },
  created_at:           { type: Date, default: Date.now },
  completed_at:         { type: Date, default: null },
}, { _id: false, versionKey: false });

const Model = mongoose.models.AgentExecution
  || mongoose.model('AgentExecution', schema, 'agent_executions');

function row(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  o.id = o._id;
  return o;
}

class AgentExecution {
  static async create(messageId, agentName, inputQuery, agentType = 'main') {
    const id = uuidv4();
    const doc = await Model.create({
      _id: id, message_id: messageId, agent_name: agentName,
      agent_type: agentType, input_query: inputQuery || '',
      status: 'processing', created_at: new Date(),
    });
    return row(doc);
  }

  static async update(id, {
    outputResponse, status, complexityLevel, decisionReason,
    assistantsInvolved, executionTime, tokensUsed, llmProvider, errorMessage,
  }) {
    const upd = { completed_at: new Date() };
    if (outputResponse !== undefined)     upd.output_response = outputResponse;
    if (status !== undefined)             upd.status = status;
    if (complexityLevel !== undefined)    upd.complexity_level = complexityLevel;
    if (decisionReason !== undefined)     upd.decision_reason = decisionReason;
    if (assistantsInvolved !== undefined) upd.sub_agents_involved = assistantsInvolved;
    if (executionTime !== undefined)      upd.execution_time_ms = executionTime;
    if (tokensUsed !== undefined)         upd.tokens_used = tokensUsed;
    if (llmProvider !== undefined)        upd.llm_provider = llmProvider;
    if (errorMessage !== undefined)       upd.error_message = errorMessage;
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

module.exports = AgentExecution;
