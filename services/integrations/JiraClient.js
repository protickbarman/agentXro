const axios = require('axios');
const logger = require('../../config/logger');

class JiraClient {
  constructor(config) {
    this.email = config.email;
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl;
    this.project = config.project;
    this.auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    this.headers = { Authorization: `Basic ${this.auth}`, 'Content-Type': 'application/json', Accept: 'application/json' };
  }

  async createIssue(params) {
    const { project = this.project, summary, description, issuetype = 'Task', priority, labels = [] } = params;
    const res = await axios.post(`${this.baseUrl}/rest/api/3/issue`,
      { fields: { project: { key: project }, summary, description, issuetype: { name: issuetype }, priority: priority ? { name: priority } : undefined, labels } },
      { headers: this.headers });
    return { id: res.data.id, key: res.data.key, url: `${this.baseUrl}/browse/${res.data.key}` };
  }

  async updateIssue(params) {
    const { issueKey, summary, description, status, priority, labels } = params;
    const fields = {};
    if (summary) fields.summary = summary;
    if (description) fields.description = description;
    if (priority) fields.priority = { name: priority };
    if (labels) fields.labels = labels;

    if (Object.keys(fields).length > 0) {
      await axios.put(`${this.baseUrl}/rest/api/3/issue/${issueKey}`,
        { fields }, { headers: this.headers });
    }

    if (status) {
      await this.transitionIssue({ issueKey, status });
    }

    return { key: issueKey, updated: true };
  }

  async searchIssues(params) {
    const { jql, maxResults = 10 } = params;
    const res = await axios.post(`${this.baseUrl}/rest/api/3/search`,
      { jql, maxResults, fields: ['summary', 'status', 'priority', 'assignee'] },
      { headers: this.headers });
    return res.data.issues.map(i => ({
      id: i.id, key: i.key, summary: i.fields.summary,
      status: i.fields.status?.name, priority: i.fields.priority?.name,
      url: `${this.baseUrl}/browse/${i.key}`,
    }));
  }

  async addComment(params) {
    const { issueKey, body } = params;
    const res = await axios.post(`${this.baseUrl}/rest/api/3/issue/${issueKey}/comment`,
      { body: { content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }] } },
      { headers: this.headers });
    return { id: res.data.id, created: res.data.created };
  }

  async getIssue(params) {
    const { issueKey } = params;
    const res = await axios.get(`${this.baseUrl}/rest/api/3/issue/${issueKey}`,
      { headers: this.headers, params: { fields: ['summary', 'description', 'status', 'priority', 'assignee', 'created'] } });
    return { key: res.data.key, summary: res.data.fields.summary, status: res.data.fields.status?.name, priority: res.data.fields.priority?.name, created: res.data.fields.created };
  }

  async transitionIssue(params) {
    const { issueKey, status } = params;
    const transitions = await axios.get(`${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
      { headers: this.headers });
    const target = transitions.data.transitions.find(t => t.to.name.toLowerCase() === status.toLowerCase());
    if (target) {
      await axios.post(`${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
        { transition: { id: target.id } }, { headers: this.headers });
    }
    return { key: issueKey, status };
  }

  async healthCheck() {
    const res = await axios.get(`${this.baseUrl}/rest/api/3/myself`, { headers: this.headers });
    return { ok: !!res.data.accountId, user: res.data.displayName };
  }
}

module.exports = { JiraClient };
