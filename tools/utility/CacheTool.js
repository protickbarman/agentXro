const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const cache = new Map();
const expiries = new Map();

class CacheTool extends Tool {
  constructor() {
    super('cache', {
      description: 'In-memory key-value cache with TTL',
      parameters: {
        type: 'object',
        properties: {
          op: { type: 'string', enum: ['get', 'set', 'del', 'clear', 'keys'], description: 'Cache operation' },
          key: { type: 'string', description: 'Cache key' },
          value: { type: 'string', description: 'Value to cache' },
          ttl: { type: 'number', description: 'Time to live in seconds' },
        },
        required: ['op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.op) throw new Error('op required');
    if (!['get', 'set', 'del', 'clear', 'keys'].includes(params.op)) throw new Error('Invalid op');
    return true;
  }

  _isExpired(key) {
    if (expiries.has(key) && Date.now() > expiries.get(key)) {
      cache.delete(key);
      expiries.delete(key);
      return true;
    }
    return false;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { op, key, value, ttl } = params;

      switch (op) {
        case 'get': {
          if (!key) throw new Error('key required for get');
          this._isExpired(key);
          return { key, value: cache.has(key) ? cache.get(key) : null, found: cache.has(key) };
        }
        case 'set': {
          if (!key) throw new Error('key required for set');
          cache.set(key, value);
          if (ttl && ttl > 0) {
            expiries.set(key, Date.now() + ttl * 1000);
          }
          return { key, value, ttl: ttl || null };
        }
        case 'del': {
          if (!key) throw new Error('key required for del');
          cache.delete(key);
          expiries.delete(key);
          return { key, deleted: true };
        }
        case 'clear':
          cache.clear();
          expiries.clear();
          return { cleared: true, count: cache.size };
        case 'keys': {
          for (const k of cache.keys()) {
            this._isExpired(k);
          }
          return { keys: Array.from(cache.keys()), count: cache.size };
        }
        default:
          throw new Error(`Unknown operation: ${op}`);
      }
    } catch (e) {
      logger.error(`CacheTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = CacheTool;
