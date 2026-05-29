const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const fs = require('fs/promises');
const path = require('path');

class ListDirTool extends Tool {
  constructor() {
    super('list_dir', {
      description: 'List directory contents',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to directory' },
          pattern: { type: 'string', description: 'Glob-style pattern filter (e.g. *.js)' },
          recursive: { type: 'boolean', description: 'List recursively' },
        },
        required: ['path'],
      },
    });
  }

  validate(p) {
    if (!p.path || typeof p.path !== 'string') throw new Error('path is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const resolvedPath = path.resolve(p.path);
      const entries = await this._list(resolvedPath, p.recursive, p.pattern, resolvedPath);
      return this.formatResult({ path: resolvedPath, entries, total: entries.length });
    } catch (e) {
      logger.error(`ListDirTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }

  async _list(dir, recursive, pattern, baseDir) {
    const results = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items.sort((a, b) => a.name.localeCompare(b.name))) {
      const fullPath = path.join(dir, item.name);
      const relPath = path.relative(baseDir, fullPath);
      if (pattern && !relPath.includes(pattern.replace('*', ''))) continue;
      if (item.isDirectory()) {
        results.push({ name: item.name, path: fullPath, type: 'directory' });
        if (recursive) {
          const sub = await this._list(fullPath, recursive, pattern, baseDir);
          results.push(...sub);
        }
      } else {
        results.push({ name: item.name, path: fullPath, type: 'file' });
      }
    }
    return results;
  }
}

module.exports = ListDirTool;
