const axios = require('axios');
const logger = require('../../config/logger');

class SlackClient {
  constructor(config) {
    this.token = config.botToken;
    this.signingSecret = config.signingSecret;
    this.baseUrl = 'https://slack.com/api';
    this.headers = { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' };
  }

  async sendMessage(params) {
    const { channel, text, blocks } = params;
    const res = await axios.post(`${this.baseUrl}/chat.postMessage`,
      { channel, text, blocks }, { headers: this.headers });
    return res.data;
  }

  async readMessages(params) {
    const { channel, limit = 10 } = params;
    const res = await axios.get(`${this.baseUrl}/conversations.history`,
      { headers: this.headers, params: { channel, limit } });
    return res.data;
  }

  async createThread(params) {
    const { channel, text, threadTs } = params;
    const res = await axios.post(`${this.baseUrl}/chat.postMessage`,
      { channel, text, thread_ts: threadTs }, { headers: this.headers });
    return res.data;
  }

  async uploadFile(params) {
    const { channels, file, filename } = params;
    const FormData = require('form-data');
    const form = new FormData();
    form.append('channels', channels);
    form.append('file', file, filename);
    const res = await axios.post(`${this.baseUrl}/files.upload`, form,
      { headers: { Authorization: `Bearer ${this.token}`, ...form.getHeaders() } });
    return res.data;
  }

  async addReaction(params) {
    const { channel, name, timestamp } = params;
    const res = await axios.post(`${this.baseUrl}/reactions.add`,
      { channel, name, timestamp }, { headers: this.headers });
    return res.data;
  }

  async searchMessages(params) {
    const { query, count = 10 } = params;
    const res = await axios.get(`${this.baseUrl}/search.messages`,
      { headers: this.headers, params: { query, count } });
    return res.data;
  }

  async healthCheck() {
    const res = await axios.get(`${this.baseUrl}/api.test`, { headers: this.headers });
    return { ok: res.data.ok };
  }
}

module.exports = { SlackClient };
