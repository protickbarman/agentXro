const Tool = require('../base/Tool');
const logger = require('../../config/logger');

function toYAML(value, indent = 0) {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') {
    if (value.includes(':') || value.includes('#') || value.includes('\n')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return '\n' + value.map(item => `${pad}- ${toYAML(item, indent + 1).trimStart()}`).join('\n');
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    return '\n' + keys.map(key => {
      const val = toYAML(value[key], indent + 1);
      return `${pad}${key}: ${val.trimStart()}`;
    }).join('\n');
  }
  return String(value);
}

class YamlStringifyTool extends Tool {
  constructor() {
    super('yaml_stringify', {
      description: 'Convert JSON to basic YAML format string',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Data to convert to YAML (any type)' },
        },
        required: ['data'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.data === undefined || params.data === null) throw new Error('data required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { data } = params;
      return { yaml: toYAML(data) };
    } catch (e) {
      logger.error('YamlStringifyTool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = YamlStringifyTool;
