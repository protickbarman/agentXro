const logger = require('../../config/logger');
const BaseProvider = require('./BaseProvider');

class CloudflareProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      name: 'cloudflare',
      model: config.defaultModel || '@cf/zai-org/glm-4.7-flash',
      maxRetries: config.maxRetries || 1,
      timeout: config.timeout || 90000,
      ...config,
    });

    this.accountManager = config.accountManager;
    this.defaultModel = config.defaultModel || '@cf/zai-org/glm-4.7-flash';
    this.fallbackModel = config.fallbackModel || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
  }

  async initialize() {
    await super.initialize();

    if (!this.accountManager || !this.accountManager.hasHealthyAccounts()) {
      logger.warn('Cloudflare provider has no accounts configured');
      return;
    }

    logger.info('Cloudflare provider initialized', {
      accounts: this.accountManager.accounts.length,
      defaultModel: this.defaultModel,
    });
  }

  async isAvailable() {
    return this.accountManager && this.accountManager.hasHealthyAccounts();
  }

  async chat(prompt, conversationHistory = [], options = {}) {
    const { onReasoning, onChunk, ...cfOptions } = options;

    const messages = cfOptions.messages && cfOptions.messages.length
      ? cfOptions.messages
      : [
          ...conversationHistory.map(msg => {
            const role = msg.role || 'user';
            let content = msg.content || msg;
            return { role, content };
          }),
          { role: 'user', content: prompt },
        ];

    const payload = {
      model: cfOptions.model || this.defaultModel,
      messages,
      temperature: cfOptions.temperature ?? 0.7,
      top_p: cfOptions.topP ?? 0.95,
      max_tokens: cfOptions.maxTokens ?? 4096,
      stream: cfOptions.stream ?? false,
    };

    for (const key of ['stop', 'frequency_penalty', 'presence_penalty', 'seed', 'tools', 'tool_choice']) {
      if (cfOptions[key] !== undefined) payload[key] = cfOptions[key];
    }

    if (payload.stream) {
      return await this._chatStream(payload, { onReasoning, onChunk });
    }

    return await this._chatNonStream(payload, { onReasoning });
  }

  async _chatNonStream(payload, { onReasoning }) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const account = this.accountManager.getNextAccount();
      if (!account) throw new Error('No healthy Cloudflare accounts available');

      const model = account.model || payload.model;
      const url = `https://api.cloudflare.com/client/v4/accounts/${account.accountId}/ai/v1/chat/completions`;
      const body = JSON.stringify({ ...payload, model });

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.apiToken}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(this.timeout),
        });

        if (res.status === 429 || res.status === 403) {
          this.accountManager.markFailed(account);
          logger.warn(`Cloudflare account ${maskAccount(account.accountId)} rate limited, trying next`);
          continue;
        }

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Cloudflare error ${res.status}: ${errBody}`);
        }

        this.accountManager.markHealthy(account);

        const data = await res.json();
        const msg = data.choices?.[0]?.message || {};
        const content = msg.content || '';
        const reasoning = msg.reasoning_content || '';

        if (reasoning && onReasoning) onReasoning(reasoning);

        const finalContent = content || (reasoning ? `[Thinking] ${reasoning}` : '');
        const tokensUsed = data.usage?.total_tokens || this.countTokens(finalContent);

        return {
          ...this.formatResponse(finalContent, {
            tokensUsed,
            finishReason: data.choices?.[0]?.finish_reason || 'stop',
          }),
          id: data.id || `chatcmpl-${Date.now()}`,
          object: data.object || 'chat.completion',
          created: data.created || Math.floor(Date.now() / 1000),
          choices: (data.choices || []).map(c => ({
            index: c.index,
            message: {
              role: 'agent',
              content: c.message?.content || finalContent,
            },
            finish_reason: c.finish_reason || 'stop',
          })),
          usage: {
            prompt_tokens: data.usage?.prompt_tokens || 0,
            completion_tokens: data.usage?.completion_tokens || 0,
            total_tokens: data.usage?.total_tokens || tokensUsed,
          },
          reasoningContent: reasoning,
        };
      } catch (err) {
        if (err.name === 'TimeoutError' || err.message.includes('aborted')) {
          this.accountManager.markFailed(account);
          throw err;
        }
        this.accountManager.markFailed(account);
        if (attempt >= 2) throw err;
      }
    }

    throw new Error('All Cloudflare accounts exhausted');
  }

  async _chatStream(payload, { onReasoning, onChunk }) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const account = this.accountManager.getNextAccount();
      if (!account) throw new Error('No healthy Cloudflare accounts available');

      const model = account.model || payload.model;
      const url = `https://api.cloudflare.com/client/v4/accounts/${account.accountId}/ai/v1/chat/completions`;
      const body = JSON.stringify({ ...payload, model });

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.apiToken}`,
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          signal: AbortSignal.timeout(this.timeout),
        });

        if (res.status === 429 || res.status === 403) {
          this.accountManager.markFailed(account);
          logger.warn(`Cloudflare account ${maskAccount(account.accountId)} rate limited, trying next`);
          continue;
        }

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Cloudflare error ${res.status}: ${errBody}`);
        }

        this.accountManager.markHealthy(account);

        return await this._readSSEStream(res, { onReasoning, onChunk });
      } catch (err) {
        if (err.name === 'TimeoutError' || err.message.includes('aborted')) {
          this.accountManager.markFailed(account);
          throw err;
        }
        if (err.message.startsWith('Cloudflare error')) {
          throw err;
        }
        this.accountManager.markFailed(account);
        if (attempt >= 2) throw err;
      }
    }

    throw new Error('All Cloudflare accounts exhausted');
  }

  async _readSSEStream(res, { onReasoning, onChunk }) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let remainder = '';
    let fullContent = '';
    let reasoningContent = '';
    let toolCalls = [];

    outerLoop:
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = remainder + decoder.decode(value, { stream: true });

      const lastNL = text.lastIndexOf('\n');
      if (lastNL === -1) {
        remainder = text;
        continue;
      }
      remainder = text.slice(lastNL + 1);
      const complete = text.slice(0, lastNL + 1);
      const lines = complete.split('\n');

      for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') break outerLoop;

        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta || {};

          if (delta.content) fullContent += delta.content;
          if (delta.reasoning_content) {
            reasoningContent += delta.reasoning_content;
            if (onReasoning) onReasoning(delta.reasoning_content);
          }
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const existing = toolCalls.find(t => t.index === tc.index);
              if (existing) {
                if (tc.function?.name) existing.function.name += tc.function.name;
                if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
              } else {
                toolCalls.push({
                  index: tc.index,
                  id: tc.id,
                  type: tc.type,
                  function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' },
                });
              }
            }
          }

          if (onChunk) onChunk(delta);
        } catch (e) {
          logger.warn('Failed to parse Cloudflare SSE line', { preview: trimmed.substring(0, 120), error: e.message });
        }
      }
    }

    if (remainder.trim()) {
      const trimmed = remainder.trim();
      if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const delta = parsed.choices?.[0]?.delta || {};
          if (delta.content) fullContent += delta.content;
          if (delta.reasoning_content) reasoningContent += delta.reasoning_content;
          if (onChunk) onChunk(delta);
        } catch {}
      }
    }

    const finalContent = fullContent || (reasoningContent ? `[Thinking] ${reasoningContent}` : '');
    const tokensUsed = this.countTokens(finalContent);

    return {
      content: finalContent,
      reasoningContent,
      toolCalls,
      tokensUsed,
      finishReason: toolCalls.length ? 'tool_calls' : 'stop',
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      choices: [{
        index: 0,
        message: {
          role: 'agent',
          content: finalContent || null,
          tool_calls: toolCalls.length > 0 ? toolCalls.map(tc => ({
            id: tc.id || `call_${Date.now()}_${tc.index}`,
            type: 'function',
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })) : undefined,
        },
        finish_reason: toolCalls.length ? 'tool_calls' : 'stop',
      }],
      usage: { prompt_tokens: 0, completion_tokens: tokensUsed, total_tokens: tokensUsed },
    };
  }

  getInfo() {
    return {
      ...super.getInfo(),
      defaultModel: this.defaultModel,
      fallbackModel: this.fallbackModel,
      accounts: this.accountManager ? this.accountManager.getStatus() : { total: 0, accounts: [] },
    };
  }
}

function maskAccount(id) {
  if (!id || id.length < 8) return id || 'unknown';
  return id.slice(0, 4) + '...' + id.slice(-4);
}

module.exports = CloudflareProvider;
