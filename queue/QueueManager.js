const Queue = require('bull');
const logger = require('../config/logger');
const env = require('../config/env');

/**
 * Queue Manager
 * Manages all Bull job queues for database operations
 */
class QueueManager {
  constructor() {
    this.queues = new Map();
    this.redisUrl = env.REDIS.url;
    this.redisConfig = {
      host: env.REDIS.host,
      port: env.REDIS.port,
      password: env.REDIS.password || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }

  /**
   * Initialize all queues
   */
  async initialize() {
    try {
      logger.info('Initializing job queues...');

      // Create queues with default options
      const redisConnection = this.redisUrl || this.redisConfig;
      this.queues.set('saveMessage', new Queue('saveMessage', redisConnection));
      this.queues.set('saveToolExecution', new Queue('saveToolExecution', redisConnection));
      this.queues.set('saveAgentExecution', new Queue('saveAgentExecution', redisConnection));
      this.queues.set('updateSession', new Queue('updateSession', redisConnection));

      // Set concurrency for all queues (sequential processing: 1 at a time)
      for (const [name, queue] of this.queues) {
        queue.process(1, async (job) => {
          // Handler will be registered by the worker
          logger.debug(`Processing job: ${name}`);
        });

        // Listen to queue events
        queue.on('completed', (job) => {
          logger.debug(`Job completed: ${name} [${job.id}]`);
        });

        queue.on('failed', (job, err) => {
          logger.error(`Job failed: ${name} [${job.id}]`, {
            error: err.message,
            attempts: job.attemptsMade,
            maxAttempts: job.opts.attempts,
          });
        });

        logger.info(`Queue initialized: ${name}`);
      }

      logger.info('All job queues initialized');
    } catch (error) {
      logger.error('Failed to initialize job queues', { error: error.message });
      throw error;
    }
  }

  /**
   * Get a specific queue
   * @param {string} queueName - Queue name
   * @returns {Queue} Bull queue instance
   */
  getQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }
    return queue;
  }

  /**
   * Add a job to a queue
   * @param {string} queueName - Queue name
   * @param {object} data - Job data
   * @param {object} options - Bull queue options
   */
  async addJob(queueName, data, options = {}) {
    try {
      const queue = this.getQueue(queueName);

      // Default options
      const jobOptions = {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        ...options,
      };

      const job = await queue.add(data, jobOptions);

      logger.debug(`Job added to queue: ${queueName}`, {
        jobId: job.id,
        data: JSON.stringify(data).substring(0, 100),
      });

      return job;
    } catch (error) {
      logger.error(`Failed to add job to queue: ${queueName}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get queue statistics
   * @returns {object} Queue statistics
   */
  async getStats() {
    try {
      const stats = {};

      for (const [name, queue] of this.queues) {
        const counts = await queue.getJobCounts();
        stats[name] = counts;
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get queue stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Clear all queues
   */
  async clear() {
    try {
      for (const [name, queue] of this.queues) {
        await queue.clean(0);
        logger.info(`Queue cleared: ${name}`);
      }
    } catch (error) {
      logger.error('Failed to clear queues', { error: error.message });
      throw error;
    }
  }

  /**
   * Close all queues
   */
  async close() {
    try {
      for (const [name, queue] of this.queues) {
        await queue.close();
        logger.info(`Queue closed: ${name}`);
      }
      logger.info('All queues closed');
    } catch (error) {
      logger.error('Failed to close queues', { error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const queueManager = new QueueManager();

module.exports = queueManager;
