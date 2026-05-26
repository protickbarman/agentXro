const Tool = require('../base/Tool');
const logger = require('../../config/logger');

function inferType(value) {
  if (value === null || value === undefined) return { type: 'null' };
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'array', items: {} };
    const itemSchemas = value.map(v => inferType(v));
    const merged = mergeSchemas(itemSchemas);
    return { type: 'array', items: merged };
  }
  const t = typeof value;
  if (t === 'string') return { type: 'string' };
  if (t === 'number') return { type: Number.isInteger(value) ? 'integer' : 'number' };
  if (t === 'boolean') return { type: 'boolean' };
  if (t === 'object') {
    const properties = {};
    const required = [];
    for (const [key, val] of Object.entries(value)) {
      properties[key] = inferType(val);
      if (val !== null && val !== undefined) required.push(key);
    }
    return { type: 'object', properties, required: required.length ? required : undefined };
  }
  return { type: typeof value };
}

function mergeSchemas(schemas) {
  if (schemas.length === 0) return {};
  const merged = { ...schemas[0] };
  for (let i = 1; i < schemas.length; i++) {
    if (merged.type !== schemas[i].type) {
      merged.type = [merged.type, schemas[i].type].flat();
    }
    if (merged.type === 'object' && schemas[i].type === 'object') {
      const allKeys = new Set([...Object.keys(merged.properties || {}), ...Object.keys(schemas[i].properties || {})]);
      const mergedProps = {};
      const mergedRequired = [];
      for (const key of allKeys) {
        const a = merged.properties?.[key];
        const b = schemas[i].properties?.[key];
        if (a && b) {
          mergedProps[key] = mergeSchemas([a, b]);
        } else {
          mergedProps[key] = a || b;
        }
        if ((merged.required || []).includes(key) || (schemas[i].required || []).includes(key)) {
          mergedRequired.push(key);
        }
      }
      merged.properties = mergedProps;
      merged.required = mergedRequired.length ? mergedRequired : undefined;
    }
  }
  return merged;
}

class JsonToSchemaTool extends Tool {
  constructor() {
    super('json_to_schema', {
      description: 'Generate JSON Schema draft-07 from example JSON data',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Example JSON data' },
          title: { type: 'string', description: 'Schema title' },
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
      const { data, title } = params;
      const inferred = inferType(data);
      const schema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        ...(title ? { title } : {}),
        ...inferred,
      };
      return JSON.parse(JSON.stringify(schema));
    } catch (e) {
      logger.error(`JsonToSchemaTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = JsonToSchemaTool;
