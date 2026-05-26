const Tool = require('../base/Tool');
const logger = require('../../config/logger');

function lcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function backtrack(dp, a, b, i, j) {
  const result = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'unchanged', value: a[i - 1], oldLine: i, newLine: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', value: b[j - 1], newLine: j });
      j--;
    } else {
      result.unshift({ type: 'removed', value: a[i - 1], oldLine: i });
      i--;
    }
  }
  return result;
}

function buildHunks(diff, context) {
  const hunks = [];
  let current = [];
  let added = 0, removed = 0, unchanged = 0;
  for (const d of diff) {
    if (d.type === 'unchanged') unchanged++;
    else if (d.type === 'added') added++;
    else if (d.type === 'removed') removed++;
  }
  for (let i = 0; i < diff.length; i++) {
    const d = diff[i];
    current.push(d);
    if (d.type !== 'unchanged') {
      const start = Math.max(0, i - context);
      const end = Math.min(diff.length - 1, i + context);
      for (let j = start; j <= end; j++) {
        if (j !== i && !current.includes(diff[j])) {
          current.push(diff[j]);
        }
      }
    }
  }
  if (current.length) {
    current.sort((a, b) => {
      const aIdx = diff.indexOf(a);
      const bIdx = diff.indexOf(b);
      return aIdx - bIdx;
    });
    const oldStart = current[0]?.oldLine || 1;
    const newStart = current[0]?.newLine || 1;
    hunks.push({ oldStart, newStart, lines: current });
  }
  return { hunks, added, removed, unchanged };
}

class DiffTool extends Tool {
  constructor() {
    super('code_diff', {
      description: 'Line-by-line diff of two code strings using LCS',
      parameters: {
        type: 'object',
        properties: {
          old: { type: 'string', description: 'Original code' },
          new: { type: 'string', description: 'Modified code' },
          context: { type: 'number', description: 'Context lines around changes' },
        },
        required: ['old', 'new'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.old === undefined || params.old === null) throw new Error('old required');
    if (params.new === undefined || params.new === null) throw new Error('new required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { old, context = 3 } = params;
      const a = old.split('\n');
      const b = params.new.split('\n');
      const dp = lcs(a, b);
      const diff = backtrack(dp, a, b, a.length, b.length);
      const result = buildHunks(diff, context);
      return result;
    } catch (e) {
      logger.error(`DiffTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = DiffTool;
