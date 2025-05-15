import Redis from 'ioredis';
import config from './index';
import logger from '../utils/logger';

class RedisClient {
  private client: Redis;

  constructor() {
    this.client = new Redis(config.redis.uri, config.redis.options);

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('error', (err) => {
      logger.error(`Redis Client Error: ${err.message}`);
    });
  }

  /**
   * Set a key-value pair in Redis
   * @param key Key to set
   * @param value Value to set
   * @param ttl Time to live in seconds (optional)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      if (ttl) {
        await this.client.set(key, stringValue, 'EX', ttl);
      } else {
        await this.client.set(key, stringValue);
      }
    } catch (error: any) {
      logger.error(`Redis set error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a value from Redis by key
   * @param key Key to get
   */
  async get(key: string): Promise<any> {
    try {
      const value = await this.client.get(key);
      
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error: any) {
      logger.error(`Redis get error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a key from Redis
   * @param key Key to delete
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error: any) {
      logger.error(`Redis del error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a key exists in Redis
   * @param key Key to check
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error: any) {
      logger.error(`Redis exists error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Increment a value in Redis
   * @param key Key to increment
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error: any) {
      logger.error(`Redis incr error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set a key's time to live in Redis
   * @param key Key to set TTL
   * @param ttl Time to live in seconds
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.client.expire(key, ttl);
    } catch (error: any) {
      logger.error(`Redis expire error: ${error.message}`);
      throw error;
    }
  }
}

export default new RedisClient(); 