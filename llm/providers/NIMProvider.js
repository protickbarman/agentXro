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

      // Build messages array — content can be string OR array (multimodal)
      const messages = [
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
      for (const key of ['chat_template_kwargs', 'stop', 'frequency_penalty', 'presence_penalty', 'seed', 'tools', 'tool_choice']) {
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

      for await (const chunk of response) {
        const text = chunk.toString('utf-8');
        const lines = text.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta || {};

            // Log structure of first non-empty delta to understand API format
            if (delta && Object.keys(delta).length > 0 && !this._loggedDeltaStructure) {
              this._loggedDeltaStructure = true;
              logger.debug('NIM SSE delta structure', { keys: Object.keys(delta), sample: JSON.stringify(delta).substring(0, 300) });
            }

            // Try standard content field, fallback to other common fields
            const chunkContent = delta.content || delta.text || delta.message?.content || '';
            if (chunkContent) {
              fullContent += chunkContent;
              if (onChunk) onChunk(chunkContent);
            }
            if (delta.reasoning_content) {
              reasoningContent += delta.reasoning_content;
              if (onReasoning) onReasoning(delta.reasoning_content);
            }
          } catch (e) {
            logger.debug('Failed to parse SSE line', { preview: trimmed.substring(0, 120), error: e.message });
          }
        }
      }

      const finalContent = fullContent || (reasoningContent ? `[Thinking] ${reasoningContent}` : '');

      if (!finalContent) {
        logger.warn('NIM streaming accumulated empty content', {
          fullContentLength: fullContent.length,
          reasoningContentLength: reasoningContent.length,
          promptLength: prompt.length,
        });
      }

      const tokensUsed = this.countTokens(prompt + finalContent);

      return {
        ...this.formatResponse(finalContent, { tokensUsed, finishReason: 'stop' }),
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        choices: [{
          index: 0,
          message: { role: 'agent', content: finalContent },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 0, completion_tokens: tokensUsed, total_tokens: tokensUsed },
        reasoningContent,
      };
    } catch (error) {
      logger.error('NVIDIA NIM streaming failed, falling back to non-streaming', { error: error.message });
      const nonStreamPayload = { ...payload, stream: false };
      const raw = (await this.client.post('/chat/completions', nonStreamPayload)).data;
      const content = raw.choices?.[0]?.message?.content || '';
      const reasoning = raw.choices?.[0]?.message?.reasoning_content || '';

      if (reasoning && onReasoning) onReasoning(reasoning);

      const finalContent = content || (reasoning ? `[Thinking] ${reasoning}` : '');
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
