const mongoose = require('mongoose');
const logger = require('./logger');
const env = require('./env');

let isConnected = false;

async function connectMongo() {
  if (isConnected) return;

  const uri = env.MONGO.uri;
  if (!uri) {
    logger.warn('MONGODB_URI not set — MongoDB features disabled');
    return;
  }

  const opts = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
  };

  let retries = 5;
  while (retries > 0) {
    try {
      await mongoose.connect(uri, opts);
      isConnected = true;
      logger.info('Connected to MongoDB');
      return;
    } catch (err) {
      retries--;
      logger.error('MongoDB connection failed', { error: err.message, retriesLeft: retries });
      if (retries === 0) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  logger.info('MongoDB reconnected');
});

module.exports = { connectMongo, mongoose };
