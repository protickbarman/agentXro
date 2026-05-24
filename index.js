const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

const logger = require('./config/logger');
const env = require('./config/env');
// Config loaded from config.json via config/env.js
const { pool } = require('./config/database');
const llmManager = require('./llm/providers/LLMManager');
const { initializeAgents } = require('./config/agentInit');
const { initializeTools } = require('./config/toolInit');
const queueManager = require('./queue/QueueManager');
const agentRegistry = require('./agents/AgentRegistry');
const { verifyToken } = require('./middleware/auth');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());
app.use(cors());

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.path,
      status: res.statusCode,
      duration,
    });
  });
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// API Routes (to be added in later phases)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/tools', require('./routes/tools'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/chat', require('./routes/ai'));
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500,
  });
});

// WebSocket setup (if enabled)
if (env.WEBSOCKET.enabled) {
  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ server });

  // Track clients by conversationId for targeted streaming
  const conversationSubscribers = new Map();
  // Track user → WebSocket connections for auth + auto-subscribe
  const userSockets = new Map();

  // Broadcast to all connected clients
  function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  // Broadcast to specific conversation subscribers OR all global subscribers
  function broadcastToConversation(conversationId, data) {
    const msg = JSON.stringify(data);
    // Send to conversation-specific subscribers
    const subscribers = conversationSubscribers.get(conversationId) || new Set();
    subscribers.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    });
    // Also send to global subscribers (skip if already a conv subscriber to avoid dupes)
    wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN && ws.isGlobalSubscriber && !subscribers.has(ws)) {
        ws.send(msg);
      }
    });
  }

  // Send data to all WS connections of a specific user
  function broadcastToUser(userId, data) {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    const msg = JSON.stringify(data);
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  }

  // Subscribe all user's WS connections to a conversation
  function subscribeUserToConversation(userId, conversationId) {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    if (!conversationSubscribers.has(conversationId)) {
      conversationSubscribers.set(conversationId, new Set());
    }
    const subs = conversationSubscribers.get(conversationId);
    for (const ws of sockets) {
      subs.add(ws);
    }
  }

  // Unsubscribe all user's WS from a conversation
  function unsubscribeUserFromConversation(userId, conversationId) {
    const subs = conversationSubscribers.get(conversationId);
    if (!subs) return;
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    for (const ws of sockets) {
      subs.delete(ws);
    }
    if (subs.size === 0) conversationSubscribers.delete(conversationId);
  }

  wss.on('connection', (ws, req) => {
    // Token is NOT required in URL anymore — client sends { type: 'auth' } after open
    let userId = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;

          case 'auth':
          case 'renew_token':
            try {
              const decoded = verifyToken(data.token);
              const newUserId = decoded.id;
              if (ws.userId && userSockets.has(ws.userId)) {
                userSockets.get(ws.userId).delete(ws);
                if (userSockets.get(ws.userId).size === 0) userSockets.delete(ws.userId);
              }
              ws.userId = newUserId;
              if (!userSockets.has(newUserId)) userSockets.set(newUserId, new Set());
              userSockets.get(newUserId).add(ws);
              ws.send(JSON.stringify({ type: 'auth_success', userId: newUserId }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
            }
            break;

          case 'subscribe_conversation':
            const convId = data.conversationId;
            if (!conversationSubscribers.has(convId)) {
              conversationSubscribers.set(convId, new Set());
            }
            conversationSubscribers.get(convId).add(ws);
            ws.send(JSON.stringify({
              type: 'subscribed',
              conversationId: convId,
              timestamp: Date.now(),
            }));
            break;

          case 'unsubscribe_conversation':
            const unsubConvId = data.conversationId;
            const subs = conversationSubscribers.get(unsubConvId);
            if (subs) {
              subs.delete(ws);
              if (subs.size === 0) conversationSubscribers.delete(unsubConvId);
            }
            break;

          case 'subscribe_all':
            ws.isGlobalSubscriber = true;
            ws.send(JSON.stringify({
              type: 'subscribed_all',
              timestamp: Date.now(),
            }));
            break;

          case 'subscribe_queue_stats':
            const stats = await queueManager.getStats();
            ws.send(JSON.stringify({ type: 'queue_stats', data: stats, timestamp: Date.now() }));
            break;

          case 'subscribe_agent_metrics':
            const metrics = agentRegistry.getMetrics();
            ws.send(JSON.stringify({ type: 'agent_metrics', data: metrics, timestamp: Date.now() }));
            break;

          default:
            ws.send(JSON.stringify({ type: 'error', error: 'Unknown message type' }));
        }
      } catch (error) {
        logger.error('WebSocket message processing error', { error: error.message });
        ws.send(JSON.stringify({ type: 'error', error: error.message }));
      }
    });

    ws.on('close', () => {
      if (ws.userId && userSockets.has(ws.userId)) {
        userSockets.get(ws.userId).delete(ws);
        if (userSockets.get(ws.userId).size === 0) userSockets.delete(ws.userId);
      }
      conversationSubscribers.forEach((subs, convId) => {
        subs.delete(ws);
        if (subs.size === 0) conversationSubscribers.delete(convId);
      });
      logger.info('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', { error: error.message });
    });
  });

  // Expose broadcast functions globally
  global.broadcastToConversation = broadcastToConversation;
  global.broadcast = broadcast;
  global.broadcastToUser = broadcastToUser;
  global.subscribeUserToConversation = subscribeUserToConversation;
  global.unsubscribeUserFromConversation = unsubscribeUserFromConversation;

  app.locals.wss = wss;
}

// Start server
const PORT = env.PORT || 3000;
server.listen(PORT, async () => {
  logger.info(`Server started on port ${PORT}`, {
    environment: env.NODE_ENV,
    websocket: env.WEBSOCKET.enabled,
  });

  // Test database connection (non-fatal if unavailable)
  try {
    await pool.query('SELECT NOW()');
    logger.info('Database connection verified');
  } catch (error) {
    logger.warn('Database unavailable — running without DB', { error: error.message });
  }

  // Initialize LLM Manager
  try {
    await llmManager.initialize();
    logger.info('LLM Manager initialized');
    app.locals.llmManager = llmManager;
  } catch (error) {
    logger.error('Failed to initialize LLM Manager', {
      error: error.message,
    });
    process.exit(1);
  }

  // Initialize agents
  try {
    await initializeAgents(app.locals.llmManager);
    logger.info('Agents initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize agents', {
      error: error.message,
    });
    process.exit(1);
  }

  // Initialize tools
  try {
    const toolRegistry = await initializeTools();
    logger.info('Tools initialized successfully');
    app.locals.toolRegistry = toolRegistry;
  } catch (error) {
    logger.error('Failed to initialize tools', {
      error: error.message,
    });
    process.exit(1);
  }

  // Initialize Bull Queues
  try {
    await queueManager.initialize();
    logger.info('Bull Queues initialized successfully');
    app.locals.queueManager = queueManager;
  } catch (error) {
    logger.error('Failed to initialize Bull Queues', {
      error: error.message,
    });
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  try {
    await queueManager.close();
    server.close(async () => {
      await pool.end();
      logger.info('Server shut down');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
});

module.exports = app;
