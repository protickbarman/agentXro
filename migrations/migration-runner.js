const { mongoose } = require('../config/mongodb');
const logger = require('../config/logger');

async function runMigrations() {
  logger.info('Starting MongoDB indexes setup');

  try {
    await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
    await mongoose.connection.db.collection('users').createIndex({ is_active: 1 });

    await mongoose.connection.db.collection('sessions').createIndex({ user_id: 1 });
    await mongoose.connection.db.collection('sessions').createIndex({ refresh_token: 1 });
    await mongoose.connection.db.collection('sessions').createIndex({ expires_at: 1 });

    await mongoose.connection.db.collection('conversations').createIndex({ user_id: 1, updated_at: -1 });
    await mongoose.connection.db.collection('messages').createIndex({ conversation_id: 1, created_at: 1 });

    await mongoose.connection.db.collection('agent_memories').createIndex({ memory_key: 1, user_id: 1 });
    await mongoose.connection.db.collection('agent_memories').createIndex({ user_id: 1, is_active: 1 });

    logger.info('MongoDB indexes created successfully');
  } catch (error) {
    logger.error('MongoDB setup failed', { error: error.message });
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;