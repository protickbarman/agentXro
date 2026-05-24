const Bull = require('bull');

const env = require('./config/env');
const logger = require('./config/logger');
const { pool } = require('./config/database');
const JobProcessor = require('./queue/JobProcessor');

let queues = {};

// Start worker
async function startWorker() {
  logger.info('Starting Bull Queue worker process');

  // Test database connection (non-fatal if unavailable)
  let dbAvailable = false;
  try {
    await pool.query('SELECT NOW()');
    logger.info('Database connection verified');
    dbAvailable = true;
  } catch (error) {
    logger.warn('Database unavailable — running without DB persistence', { error: error.message });
  }

  if (!dbAvailable) {
    logger.info('No database — worker will skip DB-dependent queue processing');
    return;
  }

  // Create queue instances
  const queueNames = ['saveMessage', 'saveToolExecution', 'saveAgentExecution', 'updateSession'];
  const redisConfig = {
    host: env.REDIS.host,
    port: env.REDIS.port,
    password: env.REDIS.password || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  for (const queueName of queueNames) {
    queues[queueName] = new Bull(queueName, redisConfig);

    // Set up processor with concurrency = 1 for sequential processing
    queues[queueName].process(1, async (job) => {
      const startTime = Date.now();
      try {
        logger.info('Processing job', {
          jobId: job.id,
          queue: queueName,
          attempt: job.attemptsMade,
        });

        let result;

        // Route job to appropriate processor
        switch (queueName) {
          case 'saveMessage':
            result = await JobProcessor.processSaveMessage(job);
            break;
          case 'saveToolExecution':
            result = await JobProcessor.processSaveToolExecution(job);
            break;
          case 'saveAgentExecution':
            result = await JobProcessor.processSaveAgentExecution(job);
            break;
          case 'updateSession':
            result = await JobProcessor.processUpdateSession(job);
            break;
          default:
            throw new Error(`Unknown queue: ${queueName}`);
        }

        const duration = Date.now() - startTime;
        logger.info('Job completed successfully', {
          jobId: job.id,
          queue: queueName,
          duration,
        });

        return { success: true, ...result, duration };
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Job processing failed', {
          jobId: job.id,
          queue: queueName,
          attempt: job.attemptsMade,
          error: error.message,
          duration,
        });

        // Bull will automatically retry based on job options
        throw error;
      }
    });

    // Event listeners for this queue
    queues[queueName].on('completed', (job) => {
      logger.debug(`Job completed: ${queueName} [${job.id}]`);
    });

    queues[queueName].on('failed', (job, err) => {
      logger.error(`Job failed: ${queueName} [${job.id}]`, {
        error: err.message,
        attempts: job.attemptsMade,
      });
    });

    logger.info(`Queue processor registered: ${queueName}`);
  }

  logger.info('Bull Queue worker started and listening for jobs');
  logger.info('Worker configuration: concurrency=1 (sequential), auto-retry with exponential backoff');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received in worker, shutting down gracefully');
  try {
    for (const queueName of Object.keys(queues)) {
      await queues[queueName].close();
    }
    await pool.end();
    logger.info('Worker shut down successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
});

// Start worker
startWorker().catch((error) => {
  logger.warn('Worker started in degraded mode (some features unavailable)', { error: error.message });
});
