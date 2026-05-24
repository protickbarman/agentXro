const { Pool } = require('pg');
const logger = require('./logger');
const env = require('./env');

// Create connection pool
const pool = new Pool({
  host: env.DB.host,
  port: env.DB.port,
  database: env.DB.database,
  user: env.DB.user,
  password: env.DB.password,
  ssl: env.DB.ssl ? { rejectUnauthorized: false } : false,
  min: env.DB.poolMin,
  max: env.DB.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

// Error handler for pool
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', {
    error: err.message,
    stack: err.stack,
  });
});

// Test connection
pool.on('connect', () => {
  logger.info('New client connected to PostgreSQL');
});

// Query function with logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn('Slow query detected', {
        query: text.substring(0, 100),
        duration,
        params,
      });
    }
    return result;
  } catch (error) {
    logger.error('Database query error', {
      query: text.substring(0, 100),
      error: error.message,
      params,
    });
    throw error;
  }
};

module.exports = {
  pool,
  query,
  // Convenience method for single row
  getOne: async (text, params) => {
    const result = await query(text, params);
    return result.rows[0];
  },
  // Convenience method for all rows
  getMany: async (text, params) => {
    const result = await query(text, params);
    return result.rows;
  },
};
