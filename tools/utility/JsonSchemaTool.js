const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class JsonSchemaTool extends Tool {
  constructor() {
    super('json_schema', {
      description: 'Generate JSON Schema from example JSON object',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Example JSON data to derive schema from' },
          title: { type: 'string', description: 'Optional schema title' },
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

  _inferSchema(val) {
    if (val === null || val === undefined) return { type: 'null' };

    if (Array.isArray(val)) {
      if (val.length === 0) return { type: 'array', items: {} };
      const itemSchemas = val.map(v => this._inferSchema(v));
      const merged = this._mergeSchemas(itemSchemas);
      return { type: 'array', items: merged };
    }

    if (typeof val === 'string') return { type: 'string' };
    if (typeof val === 'number') return { type: 'number' };
    if (typeof val === 'boolean') return { type: 'boolean' };
    if (typeof val === 'object') {
      const properties = {};
      const required = [];
      for (const key of Object.keys(val)) {
        properties[key] = this._inferSchema(val[key]);
        required.push(key);
      }
      return { type: 'object', properties, required };
    }

    return { type: typeof val };
  }

  _mergeSchemas(schemas) {
    if (schemas.length === 0) return {};
    const types = new Set(schemas.map(s => s.type));
    if (types.size === 1) return schemas[0];
    const merged = { type: Array.from(types) };
    return merged;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { data, title } = params;
      const schema = this._inferSchema(data);
      if (title) schema.title = title;
      schema.$schema = 'http://json-schema.org/draft-07/schema#';
      return { schema, title: title || null };
    } catch (e) {
      logger.error(`JsonSchemaTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = JsonSchemaTool;
