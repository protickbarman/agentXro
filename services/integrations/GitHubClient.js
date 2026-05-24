const axios = require('axios');
const logger = require('../../config/logger');

class GitHubClient {
  constructor(config) {
    this.token = config.token;
    this.owner = config.owner;
    this.baseUrl = 'https://api.github.com';
    this.headers = { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github.v3+json' };
  }

  async createIssue(params) {
    const { repo, title, body, labels = [] } = params;
    const res = await axios.post(`${this.baseUrl}/repos/${this.owner}/${repo}/issues`,
      { title, body, labels }, { headers: this.headers });
    return { number: res.data.number, url: res.data.html_url, state: res.data.state };
  }

  async createPR(params) {
    const { repo, title, body, head, base = 'main' } = params;
    const res = await axios.post(`${this.baseUrl}/repos/${this.owner}/${repo}/pulls`,
      { title, body, head, base }, { headers: this.headers });
    return { number: res.data.number, url: res.data.html_url, state: res.data.state };
  }

  async commentOnIssue(params) {
    const { repo, issueNumber, body } = params;
    const res = await axios.post(`${this.baseUrl}/repos/${this.owner}/${repo}/issues/${issueNumber}/comments`,
      { body }, { headers: this.headers });
    return { id: res.data.id, url: res.data.html_url };
  }

  async listIssues(params) {
    const { repo, state = 'open', labels } = params;
    const res = await axios.get(`${this.baseUrl}/repos/${this.owner}/${repo}/issues`,
      { headers: this.headers, params: { state, labels } });
    return res.data.map(i => ({ number: i.number, title: i.title, state: i.state, url: i.html_url }));
  }

  async getRepoContents(params) {
    const { repo, path = '' } = params;
    const res = await axios.get(`${this.baseUrl}/repos/${this.owner}/${repo}/contents/${path}`,
      { headers: this.headers });
    return res.data;
  }

  async listCommits(params) {
    const { repo, sha, per_page = 10 } = params;
    const res = await axios.get(`${this.baseUrl}/repos/${this.owner}/${repo}/commits`,
      { headers: this.headers, params: { sha, per_page } });
    return res.data.map(c => ({ sha: c.sha, message: c.commit.message, author: c.commit.author.name, date: c.commit.author.date }));
  }

  async healthCheck() {
    const res = await axios.get(`${this.baseUrl}/zen`, { headers: this.headers });
    return { ok: !!res.data };
  }
}

module.exports = { GitHubClient };
