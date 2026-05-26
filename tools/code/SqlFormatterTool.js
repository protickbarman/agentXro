const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const KEYWORDS_UPPER = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'ON',
  'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'HAVING',
  'LIMIT', 'OFFSET', 'AS', 'DISTINCT', 'ALL', 'UNION',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS',
  'LIKE', 'BETWEEN', 'INTO', 'FROM', 'WHERE',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION',
];

const CLAUSE_KEYWORDS = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'ON', 'AND', 'OR', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'VALUES', 'SET', 'INTO'];

class SqlFormatterTool extends Tool {
  constructor() {
    super('sql_format', {
      description: 'Format SQL queries by uppercasing keywords and indenting clauses',
      parameters: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'SQL query string' },
          dialect: { type: 'string', description: 'SQL dialect (mysql, postgres, sqlite)' },
        },
        required: ['sql'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.sql) throw new Error('sql required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      let { sql, dialect } = params;
      const keywordPattern = new RegExp(`\\b(${KEYWORDS_UPPER.join('|')})\\b`, 'gi');
      sql = sql.replace(keywordPattern, m => m.toUpperCase());
      const clauseStarts = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'OUTER JOIN', 'CROSS JOIN', 'JOIN', 'UNION', 'VALUES', 'SET'];
      const clauseRegex = new RegExp(`\\b(${clauseStarts.join('|')})\\b`, 'gi');
      const lines = sql.split('\n').map(l => l.trim()).filter(Boolean);
      const formatted = [];
      for (const line of lines) {
        const parts = line.split(/\b(AND|OR)\b/i);
        let current = '';
        for (const part of parts) {
          if (/^(AND|OR)$/i.test(part.trim())) {
            formatted.push(current.trim());
            current = `  ${part.toUpperCase()}`;
          } else {
            current += part;
          }
        }
        if (current.trim()) formatted.push(current.trim());
      }
      const indented = [];
      for (const line of formatted) {
        const trimmed = line.trim();
        const isClause = clauseStarts.some(k => new RegExp(`^${k}\\b`, 'i').test(trimmed));
        if (isClause && trimmed !== formatted[0]) {
          indented.push(`  ${trimmed}`);
        } else {
          indented.push(trimmed);
        }
      }
      return { sql: indented.join('\n'), dialect: dialect || 'generic' };
    } catch (e) {
      logger.error(`SqlFormatterTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = SqlFormatterTool;
