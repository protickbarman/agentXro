const env          = require('./config/env');
const logger       = require('./config/logger');
const { connectMongo, mongoose } = require('./config/mongodb');
const JobProcessor = require('./queue/JobProcessor');
const queueManager = require('./queue/QueueManager');

const QUEUE_NAMES = [
  'saveConversation', 'saveMessage',
  'saveToolExecution', 'saveAgentExecution', 'updateSession',
];

const HANDLERS = {
  saveConversation:   (job) => JobProcessor.processSaveConversation(job),
  saveMessage:        (job) => JobProcessor.processSaveMessage(job),
  saveToolExecution:  (job) => JobProcessor.processSaveToolExecution(job),
  saveAgentExecution: (job) => JobProcessor.processSaveAgentExecution(job),
  updateSession:      (job) => JobProcessor.processUpdateSession(job),
};

async function startWorker() {
  logger.info('Starting queue worker');

  // MongoDB check (non-fatal)
  let dbAvailable = false;
  try {
    await connectMongo();
    const result = await mongoose.connection.db.admin().ping();
    if (result.ok === 1) {
      logger.info('MongoDB connection verified');
      dbAvailable = true;
    }
  } catch (err) {
    logger.warn('MongoDB unavailable — running without DB persistence', { error: err.message });
  }

  if (!dbAvailable) {
    logger.info('No database — worker idle (jobs will be dropped silently)');
    return;
  }

  // Register processors with QueueManager
  queueManager.initialize();

  const concurrency = env.WORKER?.concurrency || 1;

  for (const name of QUEUE_NAMES) {
    const handler = HANDLERS[name];
    if (!handler) continue;

    // Wrap handler so it logs and never throws
    const safeHandler = async (job) => {
      const t0 = Date.now();
      try {
        const result = await handler(job);
        logger.debug(`Job done [${name}] ${Date.now() - t0}ms`);
        return result;
      } catch (err) {
        logger.error(`Job failed [${name}]`, { error: err.message, jobId: job?.id });
        throw err;
      }
    };

    queueManager.process(name, concurrency, safeHandler);
    logger.info(`Processor registered: ${name}`);
  }

  logger.info('Worker ready');
}

// Graceful shutdown
async function shutdown(signal) {
  logger.info(`${signal} received — shutting down worker`);
  try {
    await queueManager.close();
    logger.info('Worker shut down cleanly');
    process.exit(0);
  } catch (err) {
    logger.error('Error during worker shutdown', { error: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

startWorker().catch((err) => {
  logger.warn('Worker started in degraded mode', { error: err.message });
});