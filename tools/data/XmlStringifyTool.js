const Tool = require('../base/Tool');
const logger = require('../../config/logger');

function toXML(obj, rootName = 'root') {
  function serialize(value, name) {
    if (value === null || value === undefined) return `<${name}/>`;
    if (typeof value === 'object' && !Array.isArray(value)) {
      let xml = `<${name}>`;
      for (const [key, val] of Object.entries(value)) {
        xml += serialize(val, key);
      }
      xml += `</${name}>`;
      return xml;
    }
    if (Array.isArray(value)) {
      return value.map(item => serialize(item, name)).join('');
    }
    return `<${name}>${String(value)}</${name}>`;
  }
  return serialize(obj, rootName);
}

class XmlStringifyTool extends Tool {
  constructor() {
    super('xml_stringify', {
      description: 'Convert flat JSON to simple XML string',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'object', description: 'Data to convert to XML' },
          rootName: { type: 'string', description: 'Root element name' },
        },
        required: ['data'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.data) throw new Error('data required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { data, rootName = 'root' } = params;
      return { xml: toXML(data, rootName) };
    } catch (e) {
      logger.error('XmlStringifyTool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = XmlStringifyTool;
