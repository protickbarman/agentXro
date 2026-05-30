const { mongoose } = require('../config/mongodb');
const logger = require('../config/logger');

const tokenUsageSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  provider: { type: String, required: true },
  model: { type: String, required: true },
  prompt_tokens: { type: Number, default: 0 },
  completion_tokens: { type: Number, default: 0 },
  total_tokens: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  user_id: { type: String },
  agent_name: { type: String },
  conversation_id: { type: String },
  duration_ms: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

const TokenUsage = mongoose.models.TokenUsage || mongoose.model('TokenUsage', tokenUsageSchema, 'token_usage');

class CostTracker {
  constructor() {
    this.PROVIDER_COSTS = {
      nim: {
        'nvidia/nemotron-3-super-120b-a12b': { input: 0.00001, output: 0.00002 },
        'deepseek-ai/deepseek-v4-flash': { input: 0.000005, output: 0.00001 },
        'meta/llama-3.3-70b-instruct': { input: 0.000008, output: 0.000016 },
      },
      default: { input: 0.00001, output: 0.00002 },
    };
  }

  async recordUsage(usage) {
    const {
      provider, model, promptTokens, completionTokens,
      userId, agentName, conversationId, durationMs,
    } = usage;

    const totalTokens = (promptTokens || 0) + (completionTokens || 0);
    const cost = this._calculateCost(provider, model, promptTokens, completionTokens);

    try {
      const result = await TokenUsage.create({
        provider: provider || 'unknown',
        model: model || 'unknown',
        prompt_tokens: promptTokens || 0,
        completion_tokens: completionTokens || 0,
        total_tokens: totalTokens,
        cost,
        user_id: userId,
        agent_name: agentName,
        conversation_id: conversationId,
        duration_ms: durationMs || 0,
      });

      return { id: result._id, totalTokens, cost };
    } catch (err) {
      logger.error(`Failed to record token usage: ${err.message}`);
      return { totalTokens, cost };
    }
  }

  async getReport(options = {}) {
    const { groupBy = 'agent', period = 'daily', startDate, endDate, provider } = options;

    const groupMap = {
      agent: 'agent_name',
      user: 'user_id',
      provider: 'provider',
      model: 'model',
    };

    const groupField = groupMap[groupBy] || 'agent_name';

    let filter = {};
    if (startDate) filter.created_at = { $gte: new Date(startDate) };
    if (endDate) {
      filter.created_at = filter.created_at || {};
      filter.created_at.$lte = new Date(endDate);
    }
    if (provider) filter.provider = provider;

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: `$${groupField}`,
          requests: { $sum: 1 },
          total_tokens: { $sum: '$total_tokens' },
          total_cost: { $sum: '$cost' },
          avg_tokens: { $avg: '$total_tokens' },
        }
      },
      { $sort: { total_cost: -1 } }
    ];

    if (!groupField) pipeline.shift();

    try {
      const result = await TokenUsage.aggregate(pipeline);
      const grandTotal = result.reduce((s, r) => ({
        requests: s.requests + (r.requests || 0),
        tokens: s.tokens + (r.total_tokens || 0),
        cost: s.cost + (r.total_cost || 0),
      }), { requests: 0, tokens: 0, cost: 0 });

      return {
        period,
        groupBy,
        dimensions: result,
        summary: grandTotal,
      };
    } catch (err) {
      logger.error(`Failed to get cost report: ${err.message}`);
      return { period, groupBy, dimensions: [], summary: { requests: 0, tokens: 0, cost: 0 } };
    }
  }

  estimateCost(provider, model, promptTokens, completionTokens) {
    if (typeof provider === 'object') {
      const opts = provider;
      provider = opts.provider;
      model = opts.model;
      promptTokens = opts.inputTokens || opts.promptTokens;
      completionTokens = opts.outputTokens || opts.completionTokens;
    }
    const total = this._calculateCost(provider, model, promptTokens, completionTokens);
    return {
      total,
      breakdown: {
        input: (promptTokens || 0) * (this.PROVIDER_COSTS[provider]?.[model]?.input || 0.00001),
        output: (completionTokens || 0) * (this.PROVIDER_COSTS[provider]?.[model]?.output || 0.00002),
      },
      inputTokens: promptTokens || 0,
      outputTokens: completionTokens || 0,
    };
  }

  async checkThreshold(threshold = {}) {
    const { maxDaily = 10, maxWeekly = 50, maxMonthly = 200 } = threshold;

    const periods = [
      { name: 'daily', ms: 24 * 60 * 60 * 1000, limit: maxDaily },
      { name: 'weekly', ms: 7 * 24 * 60 * 60 * 1000, limit: maxWeekly },
      { name: 'monthly', ms: 30 * 24 * 60 * 60 * 1000, limit: maxMonthly },
    ];

    const alerts = [];
    for (const period of periods) {
      const since = new Date(Date.now() - period.ms);
      const result = await TokenUsage.aggregate([
        { $match: { created_at: { $gt: since } } },
        { $group: { _id: null, total: { $sum: '$cost' } } }
      ]);

      const total = result[0]?.total || 0;
      if (total > period.limit) {
        alerts.push({
          period: period.name,
          current: total,
          limit: period.limit,
          exceededBy: total - period.limit,
        });
      }
    }

    return { exceeded: alerts.length > 0, alerts };
  }

  _calculateCost(provider, model, promptTokens, completionTokens) {
    const costs = this.PROVIDER_COSTS[provider] || this.PROVIDER_COSTS.default;
    const modelCosts = costs[model] || costs.default || { input: 0.00001, output: 0.00002 };

    const inputCost = (promptTokens || 0) * modelCosts.input;
    const outputCost = (completionTokens || 0) * modelCosts.output;

    return parseFloat((inputCost + outputCost).toFixed(6));
  }
}

module.exports = new CostTracker();