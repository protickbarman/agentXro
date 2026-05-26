const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class SemverTool extends Tool {
  constructor() {
    super('semver', {
      description: 'Parse, compare, validate, sort semver strings',
      parameters: {
        type: 'object',
        properties: {
          version: { type: 'string', description: 'Semver version string' },
          other: { type: 'string', description: 'Other version for comparison' },
          op: { type: 'string', enum: ['parse', 'compare', 'valid', 'inc', 'major', 'minor', 'patch'], description: 'Operation' },
        },
        required: ['version', 'op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.version) throw new Error('version required');
    if (!params.op) throw new Error('op required');
    return true;
  }

  _parse(v) {
    const re = /^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?(?:\+([\w.-]+))?$/;
    const m = String(v).match(re);
    if (!m) throw new Error(`Invalid semver: ${v}`);
    return {
      major: parseInt(m[1], 10),
      minor: parseInt(m[2], 10),
      patch: parseInt(m[3], 10),
      prerelease: m[4] || null,
      build: m[5] || null,
    };
  }

  _compare(a, b) {
    const pa = this._parse(a);
    const pb = this._parse(b);
    if (pa.major !== pb.major) return pa.major - pb.major;
    if (pa.minor !== pb.minor) return pa.minor - pb.minor;
    if (pa.patch !== pb.patch) return pa.patch - pb.patch;
    if (pa.prerelease && !pb.prerelease) return -1;
    if (!pa.prerelease && pb.prerelease) return 1;
    if (pa.prerelease && pb.prerelease) {
      return pa.prerelease.localeCompare(pb.prerelease);
    }
    return 0;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { version, other, op } = params;

      switch (op) {
        case 'parse':
          return { version, parsed: this._parse(version) };
        case 'valid': {
          try {
            this._parse(version);
            return { version, valid: true };
          } catch {
            return { version, valid: false };
          }
        }
        case 'compare': {
          if (!other) throw new Error('other required for compare');
          const result = this._compare(version, other);
          return { version, other, result, relation: result === 0 ? 'eq' : result < 0 ? 'lt' : 'gt' };
        }
        case 'inc':
        case 'major':
        case 'minor':
        case 'patch': {
          const p = this._parse(version);
          if (op === 'major' || op === 'inc') p.major++;
          if (op === 'minor') p.minor++;
          if (op === 'patch') p.patch++;
          const next = `${p.major}.${p.minor}.${p.patch}`;
          return { version, next, operation: op };
        }
        default:
          throw new Error(`Unknown operation: ${op}`);
      }
    } catch (e) {
      logger.error(`SemverTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = SemverTool;
