const logger = require('../config/logger');

const FILE_TOOLS = new Set(['file_save', 'file_read_content', 'file_list', 'file_delete']);

class ToolOrchestrator {
  constructor({ toolRegistry, apiKey, baseUrl, model, provider, maxIterations = 10, userContext }) {
    this.toolRegistry    = toolRegistry;
    this.apiKey          = apiKey;
    this.baseUrl         = baseUrl;
    this.model           = model;
    this.provider        = provider || null;
    this.maxIterations   = maxIterations;
    this.userContext     = userContext || {};
  }

  async run(messages, payload, callbacks) {
    const { onSSE, onDone, onError } = callbacks;
    const toolSchemas     = this.toolRegistry.getSchemas();
    const currentMessages = [...messages];
    let iteration = 0;

    while (iteration < this.maxIterations) {
      iteration++;

      const llmPayload = {
        model:       payload.model || this.model,
        messages:    currentMessages,
        tools:       toolSchemas,
        tool_choice: 'auto',
        temperature: payload.temperature  ?? 0.9,
        top_p:       payload.top_p        ?? 0.95,
        max_tokens:  payload.max_tokens   ?? 4096,
        stream:      true,
      };

      const { toolCalls, finishReason } = await this._callChat(llmPayload, {
        onSSE: (line) => { if (onSSE) onSSE(line); },
      });

      if (finishReason === 'stop' || finishReason === 'length') {
        if (onDone) onDone();
        return;
      }

      if (finishReason === 'tool_calls' && toolCalls && toolCalls.length > 0) {
        const assistantMsg = {
          role:    'assistant',
          content: null,
          tool_calls: toolCalls.map(tc => ({
            id:       tc.id,
            type:     'function',
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        };
        currentMessages.push(assistantMsg);

        for (const tc of toolCalls) {
          const name = tc.function.name;
          let args = {};
          try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }

          if (this.toolRegistry.has(name)) {
            const tool = this.toolRegistry.get(name);
            if (FILE_TOOLS.has(name)) {
              Object.assign(args, { _userId: this.userContext.userId, _conversationId: this.userContext.conversationId });
            }
            try {
              const result = await tool.executeWithTimeout(args);
              currentMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
            } catch (err) {
              currentMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: err.message }) });
            }
          } else {
            currentMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: `Unknown tool: ${name}` }) });
          }
        }
        continue;
      }

      if (onDone) onDone();
      return;
    }

    if (onDone) onDone();
  }

  async _callChat(payload, callbacks = {}) {
    if (this.provider) {
      return await this._callWithProvider(payload, callbacks);
    }
    return await this._callDirect(payload, callbacks);
  }

  async _callWithProvider(payload, callbacks = {}) {
    const { onSSE } = callbacks;
    const provider = this.provider;

    let account = null;
    let baseUrl, apiKey, model;

    if (provider.name === 'cloudflare' && provider.accountManager) {
      account = provider.accountManager.getNextAccount();
      if (!account) throw new Error('No healthy Cloudflare accounts available');
      baseUrl = `https://api.cloudflare.com/client/v4/accounts/${account.accountId}/ai/v1`;
      apiKey = account.apiToken;
      model = account.model || payload.model;
    } else {
      baseUrl = (this.baseUrl || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
      apiKey = this.apiKey;
      model = payload.model;
    }

    const url = new URL(baseUrl + '/chat/completions');
    const body = JSON.stringify({ ...payload, model });

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
          'Accept':        'text/event-stream',
        },
        body,
      });
    } catch (err) {
      if (account && provider.accountManager) provider.accountManager.markFailed(account);
      throw err;
    }

    if (res.status === 429 || res.status === 403) {
      if (account && provider.accountManager) {
        provider.accountManager.markFailed(account);
        logger.warn(`Provider account rate limited, retrying next account`);
        return await this._callWithProvider(payload, callbacks);
      }
      const errBody = await res.text();
      throw new Error(`Provider error ${res.status}: ${errBody}`);
    }

    if (!res.ok) {
      if (account && provider.accountManager) provider.accountManager.markFailed(account);
      const errBody = await res.text();
      throw new Error(`Provider error ${res.status}: ${errBody}`);
    }

    if (account && provider.accountManager) {
      provider.accountManager.markHealthy(account);
    }

    return await this._readSSE(res, { onSSE });
  }

  async _callDirect(payload, callbacks = {}) {
    const { onSSE } = callbacks;
    const baseUrl = (this.baseUrl || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
    const url     = new URL(baseUrl + '/chat/completions');
    const body    = JSON.stringify(payload);

    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type':  'application/json',
        'Accept':        'text/event-stream',
      },
      body,
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error('NIM HTTP error', { status: res.status, body: errBody });
      throw new Error(`NIM error ${res.status}: ${errBody}`);
    }

    return await this._readSSE(res, { onSSE });
  }

  async _readSSE(res, callbacks = {}) {
    const { onSSE } = callbacks;
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();

    let remainder  = '';
    let toolCalls  = [];
    let finishReason = 'stop';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = remainder + decoder.decode(value, { stream: true });
      const lastNL = text.lastIndexOf('\n');
      if (lastNL === -1) {
        remainder = text;
        continue;
      }
      const complete = text.slice(0, lastNL + 1);
      remainder      = text.slice(lastNL + 1);
      const lines = complete.split('\n');

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (!line || !line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6);
        if (jsonStr === '[DONE]') break;

        let parsed;
        try { parsed = JSON.parse(jsonStr); }
        catch { continue; }

        const choice = parsed.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta || {};

        if (onSSE) {
          onSSE(line);
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const existing = toolCalls.find(t => t.index === tc.index);
            if (existing) {
              if (tc.function?.name)      existing.function.name      += tc.function.name;
              if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
            } else {
              toolCalls.push({
                index:    tc.index,
                id:       tc.id,
                type:     tc.type,
                function: {
                  name:      tc.function?.name      || '',
                  arguments: tc.function?.arguments || '',
                },
              });
            }
          }
        }

        if (choice.finish_reason) {
          finishReason = choice.finish_reason;
        }
      }
    }

    if (remainder.trim()) {
      const line = remainder.trim();
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const parsed = JSON.parse(line.slice(6));
          const choice = parsed.choices?.[0];
          if (choice) {
            const delta = choice.delta || {};
            if (onSSE) onSSE(line);
            if (choice.finish_reason) finishReason = choice.finish_reason;
          }
        } catch { /* ignore */ }
      }
    }

    return { toolCalls, finishReason };
  }
}

module.exports = ToolOrchestrator;
