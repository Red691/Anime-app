// src/config/redis.js
const Redis = require('ioredis');

/**
 * Redis cache layer for:
 * - Session management
 * - API response caching
 * - Trending/popular anime hot data
 * - Rate limiting counters
 */
class CacheService {
  constructor() {
    this.client = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true
    });

    this.client.on('connect', () => console.log('Redis Connected'));
    this.client.on('error', (err) => console.error('Redis Error:', err));
  }

  async get(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  async delete(key) {
    return await this.client.del(key);
  }

  async flush() {
    return await this.client.flushall();
  }
}

module.exports = new CacheService();
