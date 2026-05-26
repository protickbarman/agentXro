const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const MIME_MAP = {
  '.html': 'text/html', '.htm': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.mjs': 'application/javascript', '.json': 'application/json', '.xml': 'application/xml',
  '.txt': 'text/plain', '.csv': 'text/csv', '.md': 'text/markdown', '.yaml': 'text/yaml',
  '.yml': 'text/yaml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.bmp': 'image/bmp', '.tiff': 'image/tiff', '.tif': 'image/tiff', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.avi': 'video/x-msvideo', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
  '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip', '.tar': 'application/x-tar', '.gz': 'application/gzip', '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed', '.exe': 'application/vnd.microsoft.portable-executable',
  '.bin': 'application/octet-stream', '.wasm': 'application/wasm', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.eot': 'application/vnd.ms-fontobject',
};

const EXT_MAP = {};
for (const [ext, mime] of Object.entries(MIME_MAP)) {
  if (!EXT_MAP[mime]) EXT_MAP[mime] = [];
  EXT_MAP[mime].push(ext);
}

class MimeTypeTool extends Tool {
  constructor() {
    super('mime_type', {
      description: 'Look up MIME type by file extension or vice versa',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'Extension (e.g. .html) or MIME type (e.g. text/html)' },
          direction: { type: 'string', enum: ['from_ext', 'to_ext'], description: 'Lookup direction' },
        },
        required: ['value', 'direction'],
      },
    });
  }

  validate(p) {
    if (!p.value || typeof p.value !== 'string') throw new Error('value is required');
    if (!['from_ext', 'to_ext'].includes(p.direction)) throw new Error('direction must be "from_ext" or "to_ext"');
    return true;
  }

  execute(p) {
    try {
      this.validate(p);
      if (p.direction === 'from_ext') {
        const ext = p.value.startsWith('.') ? p.value.toLowerCase() : '.' + p.value.toLowerCase().replace(/^\./, '');
        const mime = MIME_MAP[ext] || 'application/octet-stream';
        return this.formatResult({ extension: ext, mimeType: mime, found: !!MIME_MAP[ext] });
      } else {
        const exts = EXT_MAP[p.value.toLowerCase()] || [];
        return this.formatResult({ mimeType: p.value.toLowerCase(), extensions: exts, found: exts.length > 0 });
      }
    } catch (e) {
      logger.error(`MimeTypeTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = MimeTypeTool;
