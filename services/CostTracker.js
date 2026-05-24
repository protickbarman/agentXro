const { query } = require('../config/database');
const logger = require('../config/logger');

/**
 * CostTracker - LLM token usage and cost tracking
 * Part of LLM & Prompt Management skill
 */
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

  /**
   * Record token usage
   * @param {object} usage - Usage data
   * @returns {Promise<object>}
   */
  async recordUsage(usage) {
    const {
      provider, model, promptTokens, completionTokens,
      userId, agentName, conversationId, durationMs,
    } = usage;

    const totalTokens = (promptTokens || 0) + (completionTokens || 0);
    const cost = this._calculateCost(provider, model, promptTokens, completionTokens);

    try {
      const result = await query(
        `INSERT INTO token_usage (provider, model, prompt_tokens, completion_tokens, total_tokens, cost, user_id, agent_name, conversation_id, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [provider || 'unknown', model || 'unknown', promptTokens || 0, completionTokens || 0,
         totalTokens, cost, userId, agentName, conversationId, durationMs || 0]
      );

      return { id: result.rows[0].id, totalTokens, cost };
    } catch (err) {
      logger.error(`Failed to record token usage: ${err.message}`);
      return { totalTokens, cost };
    }
  }

  /**
   * Get cost report grouped by dimension
   * @param {object} options - Report options
   * @returns {Promise<object>}
   */
  async getReport(options = {}) {
    const { groupBy = 'agent', period = 'daily', startDate, endDate } = options;

    const groupMap = {
      agent: 'agent_name',
      user: 'user_id',
      provider: 'provider',
      model: 'model',
    };

    const groupField = groupMap[groupBy] || 'agent_name';

    let sql = `
      SELECT ${groupField} as dimension,
             COUNT(*) as requests,
             SUM(total_tokens) as total_tokens,
             SUM(cost) as total_cost,
             AVG(total_tokens) as avg_tokens_per_request
      FROM token_usage WHERE 1=1`;

    const params = [];
    let idx = 1;

    if (startDate) {
      sql += ` AND created_at >= $${idx}`;
      params.push(startDate);
      idx++;
    }
    if (endDate) {
      sql += ` AND created_at <= $${idx}`;
      params.push(endDate);
      idx++;
    }
    if (options.provider) {
      sql += ` AND provider = $${idx}`;
      params.push(options.provider);
      idx++;
    }

    sql += ` GROUP BY ${groupField} ORDER BY total_cost DESC`;

    try {
      const result = await query(sql, params);
      const grandTotal = result.rows.reduce((s, r) => ({
        requests: s.requests + parseInt(r.requests || 0),
        tokens: s.tokens + parseInt(r.total_tokens || 0),
        cost: s.cost + parseFloat(r.total_cost || 0),
      }), { requests: 0, tokens: 0, cost: 0 });

      return {
        period,
        groupBy,
        dimensions: result.rows,
        summary: grandTotal,
      };
    } catch (err) {
      logger.error(`Failed to get cost report: ${err.message}`);
      return { period, groupBy, dimensions: [], summary: { requests: 0, tokens: 0, cost: 0 } };
    }
  }

  /**
   * Get real-time cost estimate
   * @param {string|object} provider - LLM provider or config object
   * @param {string} [model] - Model name
   * @param {number} [promptTokens] - Prompt token count
   * @param {number} [completionTokens] - Completion token count
   * @returns {object}
   */
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

  /**
   * Alert if cost exceeds threshold
   * @param {object} threshold - Cost threshold config
   * @returns {Promise<boolean>}
   */
  async checkThreshold(threshold = {}) {
    const { maxDaily = 10, maxWeekly = 50, maxMonthly = 200 } = threshold;

    const periods = [
      { name: 'daily', interval: '24 hours', limit: maxDaily },
      { name: 'weekly', interval: '7 days', limit: maxWeekly },
      { name: 'monthly', interval: '30 days', limit: maxMonthly },
    ];

    const alerts = [];
    for (const period of periods) {
      const result = await query(
        `SELECT COALESCE(SUM(cost), 0) as total FROM token_usage 
         WHERE created_at > NOW() - $1::interval`,
        [period.interval]
      );

      const total = parseFloat(result.rows[0].total);
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
