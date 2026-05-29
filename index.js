const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs/promises');
const cookieParser = require('cookie-parser');

const logger = require('./config/logger');
const env = require('./config/env');
const { connectMongo } = require('./config/mongodb');
const { initializeTools } = require('./config/toolInit');
const QueueManager = require('./queue/QueueManager');
const JobProcessor = require('./queue/JobProcessor');

const app = express();
const server = http.createServer(app);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP Request', {
      method: req.method, path: req.path,
      status: res.statusCode, duration: Date.now() - start,
    });
  });
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/providers/status', async (req, res) => {
  try {
    const llmManager = require('./llm/providers/LLMManager');
    const stats = llmManager.getStats();
    res.json({
      success: true,
      data: {
        primary: stats.primaryProvider,
        fallbacks: stats.fallbackProviders,
        cloudflare: stats.cloudflareAccounts,
        providers: stats.providers,
        totalTokensUsed: stats.totalTokensUsed,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use('/xro', require('./routes/xro'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/files', require('./routes/files'));

app.get('/api/chat', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  try {
    const { authMiddleware } = require('./middleware/auth');
    await new Promise((resolve, reject) => {
      authMiddleware(req, res, (err) => err ? reject(err) : resolve());
    });
    const Conversation = require('./models/Conversation');
    const conversations = await Conversation.findByUserIdPaginated(req.user.id, limit, 0);
    res.json({ data: conversations });
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} not found` });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, path: req.path });
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = env.PORT || 3000;

async function start() {
  /* Connect to MongoDB (chat data) */
  try {
    await connectMongo();
  } catch (err) {
    logger.warn('MongoDB connection failed — chat persistence unavailable', { error: err.message });
  }

  try {
    await initializeTools();
  } catch (err) {
    logger.warn('Tool initialization failed (server will still start)', { error: err.message });
  }

  try {
    const storageDir = path.join(__dirname, 'storage', 'files');
    await fs.mkdir(storageDir, { recursive: true });
    logger.info('Storage directory ensured', { path: storageDir });
  } catch (err) {
    logger.warn('Failed to create storage directory', { error: err.message });
  }

  try {
    QueueManager.initialize();
    logger.info('QueueManager initialized');

    const concurrency = env.WORKER?.concurrency || 1;
    const handlers = {
      saveConversation:   (job) => JobProcessor.processSaveConversation(job),
      saveMessage:        (job) => JobProcessor.processSaveMessage(job),
      saveToolExecution:  (job) => JobProcessor.processSaveToolExecution(job),
      saveAgentExecution: (job) => JobProcessor.processSaveAgentExecution(job),
      updateSession:      (job) => JobProcessor.processUpdateSession(job),
    };
    for (const [name, handler] of Object.entries(handlers)) {
      QueueManager.process(name, concurrency, handler);
      logger.info(`Job processor registered: ${name}`);
    }
  } catch (err) {
    logger.warn('QueueManager initialization failed (queues unavailable)', { error: err.message });
  }

  server.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`);
  });
}

start();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down');
  await QueueManager.close();
  process.exit(0);
});

module.exports = app;
