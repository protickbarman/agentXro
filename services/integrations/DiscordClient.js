const axios = require('axios');
const logger = require('../../config/logger');

class DiscordClient {
  constructor(config) {
    this.token = config.botToken;
    this.guildId = config.guildId;
    this.baseUrl = 'https://discord.com/api/v10';
    this.headers = { Authorization: `Bot ${this.token}`, 'Content-Type': 'application/json' };
  }

  async sendMessage(params) {
    const { channelId, content, embeds } = params;
    const res = await axios.post(`${this.baseUrl}/channels/${channelId}/messages`,
      { content, embeds }, { headers: this.headers });
    return { id: res.data.id, content: res.data.content };
  }

  async readMessages(params) {
    const { channelId, limit = 10 } = params;
    const res = await axios.get(`${this.baseUrl}/channels/${channelId}/messages`,
      { headers: this.headers, params: { limit } });
    return res.data.map(m => ({ id: m.id, content: m.content, author: m.author.username, timestamp: m.timestamp }));
  }

  async createThread(params) {
    const { channelId, name, messageId } = params;
    const res = await axios.post(`${this.baseUrl}/channels/${channelId}/messages/${messageId}/threads`,
      { name }, { headers: this.headers });
    return { id: res.data.id, name: res.data.name };
  }

  async addReaction(params) {
    const { channelId, messageId, emoji } = params;
    const res = await axios.put(
      `${this.baseUrl}/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`,
      {}, { headers: this.headers });
    return { success: res.status === 204 };
  }

  async healthCheck() {
    const res = await axios.get(`${this.baseUrl}/gateway`, { headers: this.headers });
    return { ok: !!res.data.url };
  }
}

module.exports = { DiscordClient };
