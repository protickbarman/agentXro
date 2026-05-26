const Tool = require('../base/Tool');
const logger = require('../../config/logger');

function parseXML(xml) {
  const tagRegex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>|<(\w+)([^>]*)\/>/g;
  const attrRegex = /(\w+)=["']([^"']*)["']/g;

  function buildTree(str) {
    str = str.trim();
    const root = { name: null, attributes: {}, children: [], text: '' };

    // self-closing tag
    const selfClose = str.match(/^<(\w+)([^>]*)\/>\s*$/);
    if (selfClose) {
      root.name = selfClose[1];
      const attrs = {};
      let m;
      while ((m = attrRegex.exec(selfClose[2])) !== null) {
        attrs[m[1]] = m[2];
      }
      root.attributes = attrs;
      return root;
    }

    const openMatch = str.match(/^<(\w+)([^>]*)>/);
    if (!openMatch) {
      root.text = str;
      return root;
    }

    root.name = openMatch[1];
    let m;
    while ((m = attrRegex.exec(openMatch[2])) !== null) {
      root.attributes[m[1]] = m[2];
    }

    const inner = str.substring(openMatch[0].length, str.length - `</${root.name}>`.length);
    let remaining = inner.trim();

    const childTagRegex = /<(\w+)([^>]*)>[\s\S]*?<\/\1>|<\w+[^>]*\/>/g;
    let lastIndex = 0;
    let childMatch;

    while ((childMatch = childTagRegex.exec(remaining)) !== null) {
      const textBefore = remaining.substring(lastIndex, childMatch.index).trim();
      if (textBefore) {
        root.children.push({ name: null, attributes: {}, children: [], text: textBefore });
      }
      root.children.push(buildTree(childMatch[0]));
      lastIndex = childMatch.index + childMatch[0].length;
    }

    const textAfter = remaining.substring(lastIndex).trim();
    if (textAfter) {
      root.children.push({ name: null, attributes: {}, children: [], text: textAfter });
    }

    return root;
  }

  const root = buildTree(xml.trim());
  const elements = [];
  function collect(node) {
    if (node.name) elements.push(node.name);
    for (const child of node.children) collect(child);
  }
  collect(root);

  return { root, elements: [...new Set(elements)], attributes: root.attributes };
}

class XmlParseTool extends Tool {
  constructor() {
    super('xml_parse', {
      description: 'Parse XML strings into a basic tree structure',
      parameters: {
        type: 'object',
        properties: {
          xml: { type: 'string', description: 'XML string to parse' },
        },
        required: ['xml'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.xml) throw new Error('xml required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { xml } = params;
      return parseXML(xml);
    } catch (e) {
      logger.error('XmlParseTool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = XmlParseTool;
