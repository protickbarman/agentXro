const logger = require('../config/logger');

/**
 * TokenOptimizer - Prompt optimization for token usage
 * Part of LLM & Prompt Management skill
 */
class TokenOptimizer {
  constructor() {
    this.CHARS_PER_TOKEN = 4; // Average: 4 chars ≈ 1 token
    this.MAX_PROMPT_TOKENS = 8000;
  }

  /**
   * Count tokens in text
   * @param {string} text - Input text
   * @param {string} model - Model name
   * @returns {number}
   */
  count(text, model = 'default') {
    if (!text) return 0;
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Optimize a prompt for token usage
   * @param {string} prompt - Prompt to optimize
   * @param {object} options - Optimization options
   * @returns {object}
   */
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

    // Strategy 1: Remove excessive whitespace
    optimized = optimized.replace(/\n{3,}/g, '\n\n');
    optimized = optimized.replace(/[ \t]{2,}/g, ' ');

    // Strategy 2: Remove redundant comments if preserveVariables is off
    if (!preserveVariables) {
      optimized = optimized.replace(/\/\/.*$/gm, '');
      optimized = optimized.replace(/#.*$/gm, '');
    }

    // Strategy 3: Shorten long variable names
    optimized = this._shortenVariableNames(optimized);

    // Strategy 4: Compress repeated patterns
    optimized = this._compressRepeated(optimized);

    // Strategy 5: Remove HTML comments
    optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');

    const optimizedTokens = this.count(optimized, model);
    const compression = optimizedTokens / originalTokens;

    if (optimizedTokens > maxTokens) {
      // Strategy 6: Truncate (last resort)
      const targetChars = maxTokens * this.CHARS_PER_TOKEN;
      optimized = optimized.substring(0, targetChars);
      warnings.push(`Prompt truncated to ${maxTokens} tokens`);

      // Try to find a natural break point
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

    // Find all variable names and consider shortening long ones
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
      text = text.replace(new RegExp(long, 'g'), short);
    }

    return text;
  }

  _compressRepeated(text) {
    // Compress repeated lines
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

  /**
   * Get token usage report for a period
   * @param {object} options - Report options
   * @returns {Promise<object>}
   */
  async getUsageReport(options = {}) {
    const { query } = require('../config/database');
    const { timeRange = '24h', provider, agentName } = options;

    let sql = 'SELECT COUNT(*) as total_requests, SUM(total_tokens) as total_tokens, SUM(cost) as total_cost';
    let groupSql = '';

    if (provider || agentName) {
      sql += ', ';
      if (provider) { sql += 'provider'; groupSql += 'provider'; }
      if (provider && agentName) sql += ', ';
      if (agentName) { sql += 'agent_name'; groupSql += groupSql ? ', agent_name' : 'agent_name'; }
    }

    sql += ' FROM token_usage WHERE created_at > NOW() - $1::interval';
    const params = [timeRange];

    if (provider) { sql += ' AND provider = $2'; params.push(provider); }
    if (agentName) { sql += ' AND agent_name = $3'; params.push(agentName); }

    if (groupSql) sql += ` GROUP BY ${groupSql}`;
    sql += ' ORDER BY total_tokens DESC';

    try {
      const result = await query(sql, params);
      return {
        timeRange,
        records: result.rows,
        summary: {
          totalRequests: result.rows.reduce((s, r) => s + parseInt(r.total_requests || 0), 0),
          totalTokens: result.rows.reduce((s, r) => s + parseInt(r.total_tokens || 0), 0),
          totalCost: result.rows.reduce((s, r) => s + parseFloat(r.total_cost || 0), 0),
        },
      };
    } catch (err) {
      logger.error(`Failed to get usage report: ${err.message}`);
      return { timeRange, records: [], summary: { totalRequests: 0, totalTokens: 0, totalCost: 0 } };
    }
  }
}

module.exports = new TokenOptimizer();
