const axios = require('axios');
const logger = require('../../config/logger');
const BaseProvider = require('./BaseProvider');
const { retryWithBackoff } = require('../../utils/retry');

/**
 * NVIDIA NIM LLM Provider
 */
class NIMProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      name: 'nvidia_nim',
      model: config.model || 'meta/llama-2-70b-chat-hf',
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://integrate.api.nvidia.com/v1',
      maxRetries: config.maxRetries || 1,
      timeout: config.timeout || 90000,
      ...config,
    });

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.client = null;
    this._loggedDeltaStructure = false;
    this.reasoningBudget = config.reasoningBudget || 16384;
    this.enableThinking = config.enableThinking !== false;
  }

  /**
   * Initialize provider
   * @returns {Promise}
   */
  async initialize() {
    await super.initialize();

    if (!this.apiKey) {
      throw new Error('NIM_API_KEY is required for NVIDIA NIM provider');
    }

    // Create axios client with auth
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: this.timeout,
    });

    // Test connection
    const available = await this.isAvailable();
    if (!available) {
      logger.warn('NVIDIA NIM provider may not be available');
    } else {
      logger.info('NVIDIA NIM provider initialized successfully');
    }
  }

  /**
   * Check if provider is available
   * @returns {Promise} true if available
   */
  async isAvailable() {
    try {
      const response = await this.client.get('/models');
      return response.status === 200;
    } catch (error) {
      logger.warn('NVIDIA NIM health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Send chat request to NIM
   * @param {string} prompt - User prompt
   * @param {array} conversationHistory - Previous messages
   * @param {object} options - Additional options
   * @returns {Promise} LLM response
   */
  async chat(prompt, conversationHistory = [], options = {}) {
    try {
      return await this._chatInternal(prompt, conversationHistory, options);
    } catch (error) {
      if (error.message.includes('timeout')) {
        logger.error('NVIDIA NIM timeout, not retrying', { error: error.message });
        throw error;
      }
      return retryWithBackoff(
        () => this._chatInternal(prompt, conversationHistory, options),
        this.maxRetries,
        1000,
        2
      );
    }
  }

  /**
   * Internal chat implementation (supports multimodal + streaming)
   * @private
   */
  async _chatInternal(prompt, conversationHistory = [], options = {}) {
    try {
      const { onReasoning, onChunk, ...nimOptions } = options;

      // Build messages array — support pre-built messages or prompt+history
      const messages = nimOptions.messages && nimOptions.messages.length
        ? nimOptions.messages
        : [
            ...conversationHistory.map(msg => {
              const role = msg.role || 'user';
              let content = msg.content || msg;
              return { role, content };
            }),
            { role: 'user', content: prompt },
          ];

      // Prepare request payload
      const payload = {
        model: this.model,
        messages,
        temperature: nimOptions.temperature ?? 0.7,
        top_p: nimOptions.topP ?? 0.95,
        max_tokens: nimOptions.maxTokens ?? 4096,
        stream: nimOptions.stream ?? false,
      };
      // Pass through supported NIM API options
      for (const key of ['reasoning_budget', 'chat_template_kwargs', 'stop', 'frequency_penalty', 'presence_penalty', 'seed', 'tools', 'tool_choice']) {
        if (nimOptions[key] !== undefined) payload[key] = nimOptions[key];
      }

      logger.debug('Sending request to NVIDIA NIM', {
        model: this.model,
        messagesCount: messages.length,
        stream: payload.stream,
      });

      // Streaming response
      if (payload.stream) {
        return await this._chatStream(payload, prompt, { ...nimOptions, onReasoning, onChunk });
      }

      // Non-streaming response
      const response = await this.client.post('/chat/completions', payload);
      const msg = response.data.choices[0]?.message || {};
      const content = msg.content || '';
      const reasoning = msg.reasoning_content || '';

      // Emit reasoning via callback if present
      if (reasoning && onReasoning) {
        onReasoning(reasoning);
      }

      const finalContent = content || (reasoning ? `[Thinking] ${reasoning}` : '');

      const tokensUsed = response.data.usage?.total_tokens || this.countTokens(prompt + finalContent);

      logger.info('NVIDIA NIM response received', {
        model: this.model,
        tokensUsed,
        contentLength: finalContent.length,
      });

      const raw = response.data;
      return {
        ...this.formatResponse(finalContent, {
          tokensUsed: raw.usage?.total_tokens || tokensUsed,
          finishReason: raw.choices?.[0]?.finish_reason || 'stop',
        }),
        id: raw.id || `chatcmpl-${Date.now()}`,
        object: raw.object || 'chat.completion',
        created: raw.created || Math.floor(Date.now() / 1000),
        choices: (raw.choices || []).map(c => ({
          index: c.index,
          message: {
            role: 'agent',
            content: c.message?.content || finalContent,
          },
          finish_reason: c.finish_reason || 'stop',
        })),
        usage: {
          prompt_tokens: raw.usage?.prompt_tokens || 0,
          completion_tokens: raw.usage?.completion_tokens || 0,
          total_tokens: raw.usage?.total_tokens || tokensUsed,
        },
        reasoningContent: reasoning,
      };
    } catch (error) {
      logger.error('NVIDIA NIM chat request failed', {
        error: error.message,
        status: error.response?.status,
        model: this.model,
      });
      throw error;
    }
  }

  /**
   * Handle streaming chat response
   * @private
   */
  async _chatStream(payload, prompt, options) {
    const { onReasoning, onChunk } = options;

    try {
      const https = require('https');
      const url = new URL('/v1/chat/completions', this.baseUrl);

      const response = await new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const req = https.request(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          timeout: this.timeout,
        }, resolve);
        req.on('error', reject);
        req.write(body);
        req.end();
      });

      let fullContent = '';
      let reasoningContent = '';
      let toolCalls = [];
      let remainder = '';

      outerLoop:
      for await (const chunk of response) {
        const text = remainder + chunk.toString('utf-8');

        const lastNewline = text.lastIndexOf('\n');
        if (lastNewline === -1) {
          remainder = text;
          continue;
        }
        remainder = text.slice(lastNewline + 1);
        const completeChunk = text.slice(0, lastNewline);

        const lines = completeChunk.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') break outerLoop;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta || {};

            if (delta.content) fullContent += delta.content;
            if (delta.reasoning_content) reasoningContent += delta.reasoning_content;
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const existing = toolCalls.find(t => t.index === tc.index);
                if (existing) {
                  if (tc.function?.name) existing.function.name += tc.function.name;
                  if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
                } else {
                  toolCalls.push({ index: tc.index, id: tc.id, type: tc.type, function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' } });
                }
              }
            }

            if (onChunk) onChunk(delta);
          } catch (e) {
            logger.warn('Failed to parse SSE line', { preview: trimmed.substring(0, 120), error: e.message });
          }
        }
      }

      if (remainder) {
        const trimmed = remainder.trim();
        if (trimmed && trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          if (jsonStr !== '[DONE]') {
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta || {};
              if (delta.content) fullContent += delta.content;
              if (delta.reasoning_content) reasoningContent += delta.reasoning_content;
              if (onChunk) onChunk(delta);
            } catch (e) {
              logger.debug('Failed to parse trailing SSE line', { preview: trimmed.substring(0, 120), error: e.message });
            }
          }
        }
      }

      const finalContent = fullContent || (reasoningContent ? `[Thinking] ${reasoningContent}` : '');

      if (!finalContent && !toolCalls.length) {
        logger.warn('NIM streaming accumulated empty content', {
          fullContentLength: fullContent.length,
          reasoningContentLength: reasoningContent.length,
          promptLength: prompt.length,
        });
      }

      const tokensUsed = this.countTokens(prompt + finalContent);

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
    } catch (error) {
      logger.error('NVIDIA NIM streaming failed, falling back to non-streaming', { error: error.message });
      const nonStreamPayload = { ...payload, stream: false };
      const raw = (await this.client.post('/chat/completions', nonStreamPayload)).data;
      const content = raw.choices?.[0]?.message?.content || '';
      const reasoning = raw.choices?.[0]?.message?.reasoning_content || '';

      if (reasoning && onReasoning) onReasoning(reasoning);

      const finalContent = content || (reasoning ? `[Thinking] ${reasoning}` : '');

      // Emit via onChunk so WS clients get content even in fallback path
      if (finalContent && onChunk) {
        onChunk(finalContent);
      }

      const tokensUsed = raw.usage?.total_tokens || this.countTokens(prompt + finalContent);
      return {
        ...this.formatResponse(finalContent, {
          tokensUsed,
          finishReason: raw.choices?.[0]?.finish_reason || 'stop',
        }),
        id: raw.id || `chatcmpl-${Date.now()}`,
        object: raw.object || 'chat.completion',
        created: raw.created || Math.floor(Date.now() / 1000),
        choices: (raw.choices || []).map(c => ({
          index: c.index,
          message: { role: 'agent', content: c.message?.content || finalContent },
          finish_reason: c.finish_reason || 'stop',
        })),
        usage: {
          prompt_tokens: raw.usage?.prompt_tokens || 0,
          completion_tokens: raw.usage?.completion_tokens || 0,
          total_tokens: tokensUsed,
        },
        reasoningContent: reasoning,
      };
    }
  }

  /**
   * List available models
   * @returns {Promise} List of models
   */
  async listModels() {
    try {
      const response = await this.client.get('/models');
      return response.data;
    } catch (error) {
      logger.error('Failed to list models', { error: error.message });
      throw error;
    }
  }

  /**
   * Get provider info
   * @returns {object} Provider information
   */
  getInfo() {
    return {
      ...super.getInfo(),
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
    };
  }
}

module.exports = NIMProvider;
