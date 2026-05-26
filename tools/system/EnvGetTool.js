const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class EnvGetTool extends Tool {
  constructor() {
    super('env_get', {
      description: 'Get environment variable value or list all environment variables',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Environment variable key (if omitted, returns all variables)' },
        },
        required: [],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.key && typeof params.key !== 'string') {
      throw new Error('Key must be a string');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);

      if (params.key) {
        const value = process.env[params.key];
        if (value === undefined) {
          return { key: params.key, found: false, value: null };
        }
        return { key: params.key, found: true, value };
      }

      const env = {};
      for (const [key, value] of Object.entries(process.env)) {
        env[key] = value;
      }
      return { count: Object.keys(env).length, variables: env };
    } catch (error) {
      logger.error(`EnvGet execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = EnvGetTool;
