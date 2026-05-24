const redis = require('redis');
const logger = require('./logger');
const env = require('./env');

let client;

const connectRedis = async () => {
  try {
    client = redis.createClient({
      host: env.REDIS.host,
      port: env.REDIS.port,
      password: env.REDIS.password || undefined,
      db: env.REDIS.db,
      retryStrategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          logger.error('Redis retry time exceeded');
          return new Error('Redis retry time exceeded');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      },
    });

    client.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });

    client.on('connect', () => {
      logger.info('Connected to Redis');
    });

    client.on('reconnecting', () => {
      logger.info('Reconnecting to Redis');
    });

    return client;
  } catch (error) {
    logger.error('Failed to connect to Redis', { error: error.message });
    throw error;
  }
};

module.exports = {
  connectRedis,
  getClient: () => client,
};
