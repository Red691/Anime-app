// src/config/database.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * MongoDB connection with retry logic and connection pooling
 * Optimized for high-throughput streaming metadata operations
 */
class Database {
  constructor() {
    this.maxRetries = 5;
    this.retryDelay = 5000;
    this.currentRetry = 0;
  }

  async connect() {
    const options = {
      maxPoolSize: 50,           // Handle high concurrent requests
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      w: 'majority'
    };

    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, options);
      logger.info(`MongoDB Connected: ${conn.connection.host}`);
      this.currentRetry = 0;
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error(`MongoDB Error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB Disconnected. Attempting reconnect...');
        this.handleDisconnect();
      });

    } catch (error) {
      logger.error(`MongoDB Connection Error: ${error.message}`);
      if (this.currentRetry < this.maxRetries) {
        this.currentRetry++;
        logger.info(`Retrying connection (${this.currentRetry}/${this.maxRetries})...`);
        setTimeout(() => this.connect(), this.retryDelay);
      } else {
        logger.error('Max retries reached. Exiting...');
        process.exit(1);
      }
    }
  }

  handleDisconnect() {
    setTimeout(() => this.connect(), this.retryDelay);
  }
}

module.exports = new Database();
