const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class TextDiffTool extends Tool {
  constructor() {
    super('text_diff', {
      description: 'Compute character, word, or line diff with positions',
      parameters: {
        type: 'object',
        properties: {
          old: { type: 'string', description: 'Old text' },
          new: { type: 'string', description: 'New text' },
          unit: { type: 'string', enum: ['char', 'word', 'line'], description: 'Diff unit' },
        },
        required: ['old', 'new'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.old) throw new Error('old required');
    if (!params.new) throw new Error('new required');
    return true;
  }

  computeDiff(oldArr, newArr) {
    const m = oldArr.length, n = newArr.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = oldArr[i - 1] === newArr[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    const changes = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldArr[i - 1] === newArr[j - 1]) {
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        changes.unshift({ type: 'add', value: newArr[j - 1], index: j - 1 });
        j--;
      } else if (i > 0) {
        changes.unshift({ type: 'remove', value: oldArr[i - 1], index: i - 1 });
        i--;
      }
    }
    return { changes, removed: changes.filter(c => c.type === 'remove'), added: changes.filter(c => c.type === 'add') };
  }

  async execute(params) {
    try {
      this.validate(params);
      const { old, new: newText, unit = 'char' } = params;
      let oldArr, newArr;
      switch (unit) {
        case 'char':
          oldArr = old.split('');
          newArr = newText.split('');
          break;
        case 'word':
          oldArr = old.split(/\s+/);
          newArr = newText.split(/\s+/);
          break;
        case 'line':
          oldArr = old.split('\n');
          newArr = newText.split('\n');
          break;
        default:
          oldArr = old.split('');
          newArr = newText.split('');
      }
      const diff = this.computeDiff(oldArr, newArr);
      return diff;
    } catch (e) {
      logger.error(`TextDiffTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = TextDiffTool;
