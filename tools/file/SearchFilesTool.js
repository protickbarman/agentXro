const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const fs = require('fs');
const path = require('path');

class SearchFilesTool extends Tool {
  constructor() {
    super('search_files', {
      description: 'Search files by name pattern and optionally filter by content',
      parameters: {
        type: 'object',
        properties: {
          root: { type: 'string', description: 'Root directory to search' },
          pattern: { type: 'string', description: 'Filename pattern (glob-like, e.g. *.js)' },
          content: { type: 'string', description: 'Optional content filter (searches file contents)' },
        },
        required: ['root', 'pattern'],
      },
    });
  }

  validate(p) {
    if (!p.root || typeof p.root !== 'string') throw new Error('root is required');
    if (!p.pattern || typeof p.pattern !== 'string') throw new Error('pattern is required');
    return true;
  }

  execute(p) {
    try {
      this.validate(p);
      const results = [];
      const root = path.resolve(p.root);
      const patternParts = p.pattern.split('*');
      const isMatch = name => {
        if (!patternParts.length) return true;
        if (patternParts.length === 1) return name === patternParts[0];
        return name.startsWith(patternParts[0]) && name.endsWith(patternParts[patternParts.length - 1]);
      };

      const walk = dir => {
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (entry.isFile()) {
            if (isMatch(entry.name)) {
              if (p.content) {
                try {
                  const content = fs.readFileSync(full, 'utf8');
                  if (content.includes(p.content)) {
                    results.push({ name: entry.name, path: full, size: fs.statSync(full).size });
                  }
                } catch { /* skip */ }
              } else {
                results.push({ name: entry.name, path: full, size: fs.statSync(full).size });
              }
            }
          }
        }
      };

      walk(root);
      return this.formatResult({ root, pattern: p.pattern, content: p.content, results, total: results.length });
    } catch (e) {
      logger.error(`SearchFilesTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = SearchFilesTool;
