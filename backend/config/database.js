const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Leftover from a previous auth schema; unique indexes on optional fields block
// Firebase upserts when multiple documents omit the field (stored as null).
const STALE_USER_INDEXES = ['clerkId_1', 'username_1'];

async function dropStaleUserIndexes() {
  const collection = mongoose.connection.collection('users');
  if (!collection) return;

  for (const indexName of STALE_USER_INDEXES) {
    try {
      await collection.dropIndex(indexName);
      logger.info(`Dropped stale users index: ${indexName}`);
    } catch (error) {
      if (error.codeName !== 'IndexNotFound') {
        logger.warn(`Could not drop users index ${indexName}: ${error.message}`);
      }
    }
  }
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  const directUri = process.env.MONGODB_URI_DIRECT;

  if (!uri) {
    logger.error('❌ Missing MONGODB_URI in environment. Backend startup aborted.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
    await dropStaleUserIndexes();

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('✅ MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB error: ${err.message}`);
    });
  } catch (error) {
    const message = String(error?.message || error);
    const isSrvResolutionError = /querySrv|ENOTFOUND|ECONNREFUSED/i.test(message);

    if (isSrvResolutionError && directUri) {
      try {
        logger.warn('⚠️ SRV lookup failed; retrying MongoDB connection with MONGODB_URI_DIRECT...');
        const conn = await mongoose.connect(directUri, {
          serverSelectionTimeoutMS: 5000,
        });

        logger.info(`✅ MongoDB connected via direct URI: ${conn.connection.host}`);
        await dropStaleUserIndexes();

        mongoose.connection.on('disconnected', () => {
          logger.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
          logger.info('✅ MongoDB reconnected');
        });

        mongoose.connection.on('error', (err) => {
          logger.error(`MongoDB error: ${err.message}`);
        });
        return;
      } catch (directError) {
        logger.error(`❌ MongoDB direct connection failed: ${directError.message}`);
      }
    }

    logger.error(`❌ MongoDB connection failed: ${message}`);
    logger.error('Make sure MongoDB is running: mongod --dbpath /data/db');
    process.exit(1);
  }
};

module.exports = connectDB;
