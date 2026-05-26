const Tool = require('../base/Tool');
const logger = require('../../config/logger');

function escapeCSV(value, delimiter = ',') {
  const str = String(value);
  if (str.includes('"') || str.includes(delimiter) || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

class CsvStringifyTool extends Tool {
  constructor() {
    super('csv_stringify', {
      description: 'Convert array of objects to CSV string',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'array', description: 'Array of objects to stringify' },
          columns: { type: 'array', items: { type: 'string' }, description: 'Column order (default: object keys)' },
          delimiter: { type: 'string', description: 'Delimiter character (default comma)' },
        },
        required: ['data'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.data || !Array.isArray(params.data)) throw new Error('data array required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { data, delimiter = ',', columns } = params;
      const cols = columns || (data.length > 0 ? Object.keys(data[0]) : []);
      const lines = [];
      lines.push(cols.map(c => escapeCSV(c, delimiter)).join(delimiter));
      for (const row of data) {
        lines.push(cols.map(c => escapeCSV(row[c] !== undefined ? row[c] : '', delimiter)).join(delimiter));
      }
      return { csv: lines.join('\n'), count: data.length };
    } catch (e) {
      logger.error('CsvStringifyTool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = CsvStringifyTool;
