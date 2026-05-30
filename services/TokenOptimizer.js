const logger = require('../config/logger');

class TokenOptimizer {
  constructor() {
    this.CHARS_PER_TOKEN = 4;
    this.MAX_PROMPT_TOKENS = 8000;
  }

  count(text, model = 'default') {
    if (!text) return 0;
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  optimize(prompt, options = {}) {
    const {
      maxTokens = this.MAX_PROMPT_TOKENS,
      preserveVariables = true,
      minCompression = 0.7,
      model = 'default',
    } = options;

    const originalTokens = this.count(prompt, model);
    if (originalTokens <= maxTokens) {
      return {
        text: prompt,
        originalTokens,
        optimizedTokens: originalTokens,
        compression: 1.0,
        savings: 0,
        warnings: [],
      };
    }

    let optimized = prompt;
    const warnings = [];

    optimized = optimized.replace(/\n{3,}/g, '\n\n');
    optimized = optimized.replace(/[ \t]{2,}/g, ' ');

    if (!preserveVariables) {
      optimized = optimized.replace(/\/\/.*$/gm, '');
      optimized = optimized.replace(/#.*$/gm, '');
    }

    optimized = this._shortenVariableNames(optimized);
    optimized = this._compressRepeated(optimized);
    optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');

    let optimizedTokens = this.count(optimized, model);
    let compression = optimizedTokens / originalTokens;

    if (optimizedTokens > maxTokens) {
      const targetChars = maxTokens * this.CHARS_PER_TOKEN;
      optimized = optimized.substring(0, targetChars);
      warnings.push(`Prompt truncated to ${maxTokens} tokens`);

      const lastBreak = Math.max(
        optimized.lastIndexOf('\n\n'),
        optimized.lastIndexOf('. '),
        optimized.lastIndexOf('\n')
      );
      if (lastBreak > targetChars * 0.7) {
        optimized = optimized.substring(0, lastBreak + 1);
      }
    }

    const finalTokens = this.count(optimized, model);
    const finalCompression = finalTokens / originalTokens;

    return {
      text: optimized,
      originalTokens,
      optimizedTokens: finalTokens,
      compression: finalCompression,
      savings: originalTokens - finalTokens,
      warnings,
    };
  }

  _shortenVariableNames(text) {
    const varPattern = /\{\{?\s*([a-zA-Z_]\w*)\s*\}?\}/g;
    const replacements = {};
    let match;

    while ((match = varPattern.exec(text)) !== null) {
      const varName = match[1];
      if (varName.length > 15 && !replacements[varName]) {
        const shortName = varName
          .replace(/description/gi, 'desc')
          .replace(/configuration/gi, 'config')
          .replace(/information/gi, 'info')
          .replace(/parameter/gi, 'param')
          .replace(/attribute/gi, 'attr')
          .replace(/response/gi, 'resp')
          .replace(/request/gi, 'req');
        if (shortName !== varName) {
          replacements[varName] = shortName;
        }
      }
    }

    for (const [long, short] of Object.entries(replacements)) {
      text = text.replace(new RegExp(long.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), short);
    }

    return text;
  }

  _compressRepeated(text) {
    const lines = text.split('\n');
    const uniqueLines = [];
    const seen = new Set();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      uniqueLines.push(line);
    }

    return uniqueLines.join('\n');
  }

  async getUsageReport(options = {}) {
    const { timeRange = '24h', provider, agentName } = options;
    const { mongoose } = require('../config/mongodb');
    const TokenUsage = mongoose.models.TokenUsage
      || mongoose.model('TokenUsage', require('../services/CostTracker').constructor);

    const ms = { h: 3600000, d: 86400000, w: 604800000 }[(timeRange.match(/[a-z]$/) || ['h'])[0]] || 3600000;

    let filter = { created_at: { $gt: new Date(Date.now() - ms) } };
    if (provider) filter.provider = provider;
    if (agentName) filter.agent_name = agentName;

    try {
      const result = await TokenUsage.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total_requests: { $sum: 1 },
            total_tokens: { $sum: '$total_tokens' },
            total_cost: { $sum: '$cost' },
            avg_tokens_per_request: { $avg: '$total_tokens' },
          }
        }
      ]);

      const row = result[0] || { total_requests: 0, total_tokens: 0, total_cost: 0, avg_tokens_per_request: 0 };

      return {
        timeRange,
        records: result,
        summary: {
          totalRequests: row.total_requests,
          totalTokens: row.total_tokens,
          totalCost: row.total_cost,
        },
      };
    } catch (err) {
      logger.error(`Failed to get usage report: ${err.message}`);
      return { timeRange, records: [], summary: { totalRequests: 0, totalTokens: 0, totalCost: 0 } };
    }
  }
}

module.exports = new TokenOptimizer();