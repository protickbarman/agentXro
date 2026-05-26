const Tool = require('../base/Tool');
const logger = require('../../config/logger');

function parseCSV(csv, delimiter = ',', hasHeader = true) {
  const lines = csv.trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [], count: 0 };

  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const headers = hasHeader ? parseLine(lines[0]) : null;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows = dataLines.map(line => {
    const values = parseLine(line);
    if (hasHeader) {
      const row = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return row;
    }
    return values;
  });

  return { headers: hasHeader ? headers : null, rows, count: rows.length };
}

class CsvParseTool extends Tool {
  constructor() {
    super('csv_parse', {
      description: 'Parse CSV strings into arrays of objects',
      parameters: {
        type: 'object',
        properties: {
          csv: { type: 'string', description: 'CSV string to parse' },
          delimiter: { type: 'string', description: 'Delimiter character (default comma)' },
          hasHeader: { type: 'boolean', description: 'Whether CSV has a header row' },
        },
        required: ['csv'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.csv) throw new Error('csv required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { csv, delimiter = ',', hasHeader = true } = params;
      return parseCSV(csv, delimiter, hasHeader);
    } catch (e) {
      logger.error('CsvParseTool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = CsvParseTool;
