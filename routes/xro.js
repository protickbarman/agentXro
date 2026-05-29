const express = require('express');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { authMiddleware } = require('../middleware/auth');
const env = require('../config/env');
const toolRegistry = require('../tools/ToolRegistry');
const ToolOrchestrator = require('../services/ToolOrchestrator');
const Conversation = require('../models/Conversation');
const QueueManager = require('../queue/QueueManager');
const AccountManager = require('../llm/providers/AccountManager');
const CloudflareProvider = require('../llm/providers/CloudflareProvider');

const router = express.Router();

function injectReceivedAt(line) {
  if (!line.startsWith('data: ')) return line;
  const raw = line.slice(6);
  if (raw === '[DONE]') return line;
  try {
    const parsed = JSON.parse(raw);
    parsed.received_at = Date.now();
    return 'data: ' + JSON.stringify(parsed);
  } catch {
    return line;
  }
}

function startSSE(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Transfer-Encoding': 'chunked',
  });
  if (res.socket) {
    res.socket.setNoDelay(true);
    res.socket.setTimeout(0);
    if (res.socket.uncork) res.socket.uncork();
  }
  res.flushHeaders();
}

function sseWrite(res, data) {
  if (!res.writableEnded) {
    res.write(data);
    if (typeof res.flush === 'function') {
      res.flush();
    } else if (res.socket && !res.socket.destroyed) {
      if (res.socket.uncork) res.socket.uncork();
    }
  }
}

function createProvider() {
  if (env.CLOUDFLARE.accounts && env.CLOUDFLARE.accounts.length > 0) {
    const am = new AccountManager(env.CLOUDFLARE.accounts);
    return new CloudflareProvider({
      accountManager: am,
      defaultModel: env.CLOUDFLARE.defaultModel,
      fallbackModel: env.CLOUDFLARE.fallbackModel,
    });
  }
  return null;
}

router.post('/v1', authMiddleware, async (req, res) => {
  const payload = req.body;

  if (!payload || !payload.messages) {
    return res.status(400).json({ error: 'Missing messages in payload' });
  }

  let convId = payload.conversationId;
  let isNew = payload.isNew === true;

  // Don't await DB check - validate async in background, use UUID directly
  if (!convId) {
    convId = uuidv4();
    isNew = true;
  } else if (!isNew) {
    // Fire-and-forget validation - if invalid, queue will handle gracefully
    Conversation.findById(convId)
      .then(conv => {
        if (!conv || conv.user_id !== req.user.id) {
          logger.warn('Invalid conversationId provided, using as-is', { convId });
        }
      })
      .catch(() => {
        logger.warn('Conversation validation failed, using as-is', { convId });
      });
  }

  const title = payload.messages[0]?.content?.substring(0, 50) || 'New Chat';

  /* ── All DB writes deferred to after full response (see onDone) ── */
  const userContent = payload.messages[0]?.content || '';

  startSSE(res);

  sseWrite(res, `data: ${JSON.stringify({ conversationId: convId, isNew, received_at: Date.now() })}\n\n`);

  const useTools = payload.tools === true || payload.tools === 'true' || Array.isArray(payload.tools);
  let fullContent = '';

  // Build NIM payload - ensure tools is always a list or omitted
  const nimPayload = {
    ...payload,
    model: payload.model || env.NIM.model,
    stream: true,
  };

  // Remove tools if false, keep as array if provided
  if (nimPayload.tools === false || nimPayload.tools === 'false') {
    delete nimPayload.tools;
  } else if (!Array.isArray(nimPayload.tools)) {
    delete nimPayload.tools;
  }

  if (useTools && toolRegistry.getNames().length > 0) {
    const cfProvider = createProvider();
    const orchestrator = new ToolOrchestrator({
      toolRegistry,
      apiKey: env.NIM.apiKey,
      baseUrl: env.NIM.baseUrl,
      model: cfProvider ? env.CLOUDFLARE.defaultModel : env.NIM.model,
      provider: cfProvider,
      userContext: { userId: req.user.id, conversationId: convId },
    });

    try {
      await orchestrator.run(payload.messages, payload, {
        onSSE: (line) => {
          sseWrite(res, injectReceivedAt(line) + '\n\n');
          try {
            const jsonStr = line.startsWith('data: ') ? line.slice(6) : null;
            if (jsonStr && jsonStr !== '[DONE]') {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullContent += content;
            }
          } catch {}
        },
        onDone: async () => {
          sseWrite(res, 'data: [DONE]\n\n');
          if (!res.writableEnded) res.end();
          /* Save everything in background after full response */
          if (isNew) {
            QueueManager.add('saveConversation', {
              id: convId, userId: req.user.id, title,
            }).catch(() => {});
          }
          QueueManager.add('saveMessage', {
            conversationId: convId, role: 'user', content: userContent,
          }).catch(() => {});
          QueueManager.add('saveMessage', {
            conversationId: convId,
            role: 'agent',
            content: fullContent || '',
          }).catch(() => {});
        },
        onError: (err) => {
          logger.error('Orchestration error', { error: err.message });
          sseWrite(res, `data: {"error":${JSON.stringify(err.message)}}\n\n`);
          if (!res.writableEnded) res.end();
        },
      });
    } catch (err) {
      logger.error('Orchestration fatal', { error: err.message });
      sseWrite(res, `data: {"error":${JSON.stringify(err.message)}}\n\n`);
      if (!res.writableEnded) res.end();
    }
  } else {
    const cfProvider = createProvider();
    let fetchUrl, fetchHeaders;

    if (cfProvider) {
      const account = cfProvider.accountManager.getNextAccount();
      if (!account) {
        sseWrite(res, `data: {"error":"No healthy Cloudflare accounts available"}\n\n`);
        if (!res.writableEnded) res.end();
        return;
      }
      const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${account.accountId}/ai/v1`;
      fetchUrl = new URL(baseUrl + '/chat/completions');
      fetchHeaders = {
        'Authorization': `Bearer ${account.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      };
      nimPayload.model = account.model || env.CLOUDFLARE.defaultModel;
      cfProvider.accountManager.markHealthy(account);
    } else {
      const baseUrl = (env.NIM.baseUrl || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
      fetchUrl = new URL(baseUrl + '/chat/completions');
      fetchHeaders = {
        'Authorization': `Bearer ${env.NIM.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      };
    }

    const body = JSON.stringify(nimPayload);

    logger.info('Proxying to LLM', { host: fetchUrl.host, path: fetchUrl.pathname });

    try {
      const llmRes = await fetch(fetchUrl, {
        method: 'POST',
        headers: fetchHeaders,
        body,
      });

      if (!llmRes.ok) {
        let errorDetail = '';
        try { errorDetail = await llmRes.text(); } catch {}
        logger.error('LLM API error', { status: llmRes.status, error: errorDetail });
        sseWrite(res, `data: {"error":"LLM upstream error: ${llmRes.status}","details":${JSON.stringify(errorDetail)}}\n\n`);
        if (!res.writableEnded) res.end();
        return;
      }

      const reader = llmRes.body.getReader();
      const decoder = new TextDecoder();
      let remainder = '';

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = remainder + decoder.decode(value, { stream: true });
            const lastNewline = text.lastIndexOf('\n');
            if (lastNewline === -1) {
              remainder = text;
              continue;
            }
            remainder = text.slice(lastNewline + 1);
            const lines = text.slice(0, lastNewline).split('\n');

            for (const part of lines) {
              const trimmed = part.trim();
              if (!trimmed) continue;

              if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
                try {
                  const parsed = JSON.parse(trimmed.slice(6));
                  const delta = parsed.choices?.[0]?.delta || {};
                  if (delta.content) fullContent += delta.content;
                } catch {}
                sseWrite(res, injectReceivedAt(trimmed) + '\n\n');
              }
            }
          }

          if (remainder && !res.writableEnded) {
            const trimmed = remainder.trim();
            if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const delta = parsed.choices?.[0]?.delta || {};
                if (delta.content) fullContent += delta.content;
              } catch {}
              sseWrite(res, injectReceivedAt(trimmed) + '\n\n');
            }
          }
          sseWrite(res, 'data: [DONE]\n\n');
          if (!res.writableEnded) res.end();
          /* Save everything in background after full response */
          if (isNew) {
            QueueManager.add('saveConversation', {
              id: convId, userId: req.user.id, title,
            }).catch(() => {});
          }
          QueueManager.add('saveMessage', {
            conversationId: convId, role: 'user', content: userContent,
          }).catch(() => {});
          QueueManager.add('saveMessage', {
            conversationId: convId, role: 'agent', content: fullContent || '',
          }).catch(() => {});
        } catch (err) {
          logger.error('Stream pump error', { error: err.message });
          if (!res.writableEnded) res.end();
        }
      };

      pump();

      req.on('close', () => {
        reader.cancel().catch(() => {});
        if (!res.writableEnded) res.end();
      });

    } catch (err) {
      logger.error('LLM proxy error', { error: err.message });
      sseWrite(res, `data: {"error":${JSON.stringify(err.message)}}\n\n`);
      if (!res.writableEnded) res.end();
    }
  }
});

router.post('/chat', authMiddleware, async (req, res) => {
  const { message, conversationId } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  let convId = conversationId;
  let isNew = false;

  // Don't await DB check - validate async in background, use UUID directly
  if (convId) {
    // Fire-and-forget validation - if invalid, queue will handle gracefully
    Conversation.findById(convId)
      .then(conv => {
        if (!conv || conv.user_id !== req.user.id) {
          logger.warn('Invalid conversationId provided, using as-is', { convId });
        }
      })
      .catch(() => {
        logger.warn('Conversation validation failed, using as-is', { convId });
      });
  } else {
    convId = uuidv4();
    isNew = true;
  }

  const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');

  if (isNew) {
    QueueManager.add('saveConversation', {
      id: convId, userId: req.user.id, title,
    }).catch((err) => logger.error('Queue saveConversation failed', { error: err.message }));
  }
  QueueManager.add('saveMessage', {
    conversationId: convId, role: 'user', content: message,
  }).catch((err) => logger.error('Queue saveMessage (user) failed', { error: err.message }));

  startSSE(res);
  sseWrite(res, `data: ${JSON.stringify({ conversationId: convId })}\n\n`);

  let fullContent = '';
  const msgPayload = {
    messages: [{ role: 'user', content: message }],
    tools: true,
    stream: true,
  };

  const cfProvider = createProvider();
  const orchestrator = new ToolOrchestrator({
    toolRegistry,
    apiKey: env.NIM.apiKey,
    baseUrl: env.NIM.baseUrl,
    model: cfProvider ? env.CLOUDFLARE.defaultModel : env.NIM.model,
    provider: cfProvider,
    userContext: { userId: req.user.id, conversationId: convId },
  });

  try {
    await orchestrator.run(msgPayload.messages, msgPayload, {
      onSSE: (line) => {
        sseWrite(res, line + '\n\n');
        try {
          const jsonStr = line.startsWith('data: ') ? line.slice(6) : null;
          if (jsonStr && jsonStr !== '[DONE]') {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullContent += content;
          }
        } catch {}
      },
      onDone: async () => {
        sseWrite(res, 'data: [DONE]\n\n');
        if (!res.writableEnded) res.end();
        QueueManager.add('saveMessage', {
          conversationId: convId,
          role: 'agent',
          content: fullContent || '',
        }).catch(() => {});
      },
      onError: (err) => {
        logger.error('Chat orchestration error', { error: err.message });
        sseWrite(res, `data: {"error":${JSON.stringify(err.message)}}\n\n`);
        if (!res.writableEnded) res.end();
      },
    });
  } catch (err) {
    logger.error('Chat orchestration fatal', { error: err.message });
    sseWrite(res, `data: {"error":${JSON.stringify(err.message)}}\n\n`);
    if (!res.writableEnded) res.end();
  }
});

module.exports = router;
