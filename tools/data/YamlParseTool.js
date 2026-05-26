const Tool = require('../base/Tool');
const logger = require('../../config/logger');

function parseYAML(yaml) {
  const lines = yaml.split('\n');
  const root = {};
  const stack = [{ indent: -1, obj: root, key: null }];

  for (const line of lines) {
    const trimmed = line.replace(/^\s+/, '');
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.length - trimmed.length;
    const arrayMatch = trimmed.match(/^-\s+(.+)/);
    const kvMatch = trimmed.match(/^(\w[\w\s]*?):\s*(.*)/);

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];

    if (arrayMatch) {
      const value = arrayMatch[1].replace(/^["']|["']$/g, '');
      if (!Array.isArray(parent.obj)) {
        parent.obj = [];
        if (parent.key !== null) {
          const parentObj = stack[stack.length - 2].obj;
          parentObj[parent.key] = parent.obj;
        }
      }
      parent.obj.push(value);
    } else if (kvMatch) {
      const key = kvMatch[1].trim();
      let value = kvMatch[2].trim();
      if (value === '' || value === '|') {
        const newObj = {};
        if (Array.isArray(parent.obj)) {
          // shouldn't happen
        }
        parent.obj[key] = newObj;
        stack.push({ indent, obj: newObj, key: null });
      } else {
        value = value.replace(/^["']|["']$/g, '');
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (value === 'null') value = null;
        else if (!isNaN(value) && value !== '') value = Number(value);
        parent.obj[key] = value;
      }
    }
  }

  return root;
}

class YamlParseTool extends Tool {
  constructor() {
    super('yaml_parse', {
      description: 'Parse basic YAML (indentation-based key:value format)',
      parameters: {
        type: 'object',
        properties: {
          yaml: { type: 'string', description: 'YAML string to parse' },
        },
        required: ['yaml'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.yaml) throw new Error('yaml required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { yaml } = params;
      return parseYAML(yaml);
    } catch (e) {
      logger.error('YamlParseTool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = YamlParseTool;
