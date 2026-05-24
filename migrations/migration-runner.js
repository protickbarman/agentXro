const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const logger = require('../config/logger');

async function runMigrations() {
  logger.info('Starting database migrations');

  try {
    // Get all migration files
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && f !== '002_add_indexes.sql')
      .sort();

    if (files.length === 0) {
      logger.warn('No migration files found');
      return;
    }

    // Execute each migration
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      logger.info(`Running migration: ${file}`);

      try {
        await pool.query(sql);
        logger.info(`Migration completed: ${file}`);
      } catch (error) {
        logger.error(`Migration failed: ${file}`, {
          error: error.message,
        });
        throw error;
      }
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration process failed', {
      error: error.message,
    });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
