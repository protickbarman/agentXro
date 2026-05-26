const logger = require('../config/logger');

const FILE_TOOLS = new Set(['file_save', 'file_read_content', 'file_list', 'file_delete']);

class ToolOrchestrator {
  constructor({ toolRegistry, apiKey, baseUrl, model, maxIterations = 10, userContext }) {
    this.toolRegistry   = toolRegistry;
    this.apiKey         = apiKey;
    this.baseUrl        = baseUrl;
    this.model          = model;
    this.maxIterations  = maxIterations;
    this.userContext    = userContext || {};
  }

  async run(messages, payload, callbacks) {
    const { onThinking, onReasoning, onDone, onError, onSSE, onFileCreated, onToolStart, onToolEnd } = callbacks;
    const toolSchemas    = this.toolRegistry.getSchemas();
    const currentMessages = [...messages];
    let iteration = 0;

    while (iteration < this.maxIterations) {
      iteration++;

      const nimPayload = {
        model:        payload.model || this.model,
        messages:     currentMessages,
        tools:        toolSchemas,
        tool_choice:  'auto',
        temperature:  payload.temperature  ?? 0.9,
        top_p:        payload.top_p        ?? 0.95,
        max_tokens:   payload.max_tokens   ?? 4096,
        stream:       true,
      };

      const { toolCalls, finishReason } = await this._callNIM(nimPayload, {
        onReasoning: (chunk) => { if (onReasoning) onReasoning(chunk); },
        onSSE:       (line)  => { if (onSSE)       onSSE(line); },
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

          if (onThinking) onThinking(`⚙️ Running tool: ${name}…`);

          const stepId = `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          if (onToolStart) onToolStart(name, stepId, `Running ${name}…`);

          if (this.toolRegistry.has(name)) {
            const tool = this.toolRegistry.get(name);
            if (FILE_TOOLS.has(name)) {
              Object.assign(args, { _userId: this.userContext.userId, _conversationId: this.userContext.conversationId });
            }
            try {
              const result = await tool.executeWithTimeout(args);
              if (name === 'file_save' && result.success && result.data && onFileCreated) {
                onFileCreated(result.data);
              }
              if (onToolEnd) onToolEnd(name, stepId, 'success', `${name} completed`);
              currentMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
            } catch (err) {
              if (onToolEnd) onToolEnd(name, stepId, 'failed', err.message);
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

    if (onThinking) onThinking('Max iterations reached.');
    if (onDone) onDone();
  }

  async _callNIM(payload, callbacks = {}) {
    const { onReasoning, onSSE } = callbacks;
    const baseUrl = this.baseUrl.replace(/\/+$/, '');
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

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();

    let remainder  = '';   // incomplete line carried across reads
    let toolCalls  = [];
    let finishReason = 'stop';

    // Process each network chunk as it arrives — no holding back
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Append new bytes to any leftover from the previous read
      const text = remainder + decoder.decode(value, { stream: true });

      // Find the last newline so we only process complete lines
      const lastNL = text.lastIndexOf('\n');
      if (lastNL === -1) {
        // Haven't seen a newline yet — keep buffering
        remainder = text;
        continue;
      }

      // Everything up to and including the last newline is complete
      const complete = text.slice(0, lastNL + 1);
      remainder      = text.slice(lastNL + 1);

      // Split into individual lines and process each one immediately
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

        // ── Reasoning / thinking tokens ──────────────────
        const reasoningChunk = delta.reasoning_content || delta.reasoning;
        if (reasoningChunk && reasoningChunk.length > 0 && onReasoning) {
          onReasoning(reasoningChunk);
        }

        // ── Regular content — emit SSE line immediately ──
        // Only forward lines that have actual content or are finish signals
        if (!delta.tool_calls && onSSE) {
          onSSE(line);          // ← emit right away, don't buffer
        }

        // ── Tool call deltas ─────────────────────────────
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

    // Handle any leftover bytes after the stream closes
    if (remainder.trim()) {
      const line = remainder.trim();
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const parsed = JSON.parse(line.slice(6));
          const choice = parsed.choices?.[0];
          if (choice) {
            const delta = choice.delta || {};
            const reasoningChunk = delta.reasoning_content || delta.reasoning;
            if (reasoningChunk && onReasoning) onReasoning(reasoningChunk);
            if (!delta.tool_calls && onSSE) onSSE(line);
            if (choice.finish_reason) finishReason = choice.finish_reason;
          }
        } catch { /* ignore */ }
      }
    }

    return { toolCalls, finishReason };
  }
}

module.exports = ToolOrchestrator;
