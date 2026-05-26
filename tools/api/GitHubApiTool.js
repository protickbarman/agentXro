const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class GitHubApiTool extends Tool {
  constructor() {
    super('github_api', {
      description: 'Call the GitHub REST API',
      parameters: {
        type: 'object',
        properties: {
          endpoint: { type: 'string', description: 'API endpoint path (e.g. /repos/owner/repo)' },
          token: { type: 'string', description: 'GitHub personal access token' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], description: 'HTTP method' },
          data: { type: 'object', description: 'Request body for POST/PUT/PATCH' },
          owner: { type: 'string', description: 'Repository owner' },
          repo: { type: 'string', description: 'Repository name' },
        },
        required: ['endpoint'],
      },
    });
    this.timeout = 15000;
  }

  validate(p) {
    if (!p.endpoint || typeof p.endpoint !== 'string') throw new Error('endpoint is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      let path = p.endpoint;
      if (p.owner && p.repo) path = `/repos/${p.owner}/${p.repo}${path.startsWith('/') ? path : '/' + path}`;
      if (!path.startsWith('/')) path = '/' + path;
      const url = `https://api.github.com${path}`;
      const headers = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'xro-agent-backend',
      };
      if (p.token) headers.Authorization = `Bearer ${p.token}`;
      const method = (p.method || 'GET').toLowerCase();
      const config = { headers, timeout: this.timeout };
      if (p.data && ['post', 'put', 'patch'].includes(method)) config.data = p.data;
      const res = await axios[method](url, config);
      return this.formatResult({ status: res.status, data: res.data, headers: res.headers });
    } catch (e) {
      logger.error(`GitHubApiTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = GitHubApiTool;
