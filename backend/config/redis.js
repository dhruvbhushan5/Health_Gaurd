const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Check if Redis is disabled (keep fallback option)
      if (process.env.REDIS_DISABLED === 'true' || !process.env.REDIS_URL) {
        console.log('ℹ️  Redis caching is optional and not configured.');
        this.isConnected = false;
        return null;
      }

      console.log('🔄 Attempting Redis connection...');

      // Create Redis client
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        retry_strategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });

      // Handle connection events
      this.client.on('connect', () => {
        console.log('🔗 Redis client connected');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis client ready for login/register caching');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('🔚 Redis connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
      
      return this.client;
    } catch (error) {
      console.error('Redis connection failed:', error.message);
      console.log('ℹ️  App will continue without Redis caching.');
      this.isConnected = false;
      return null;
    }
  }

  // Get data from Redis
  async get(key) {
    try {
      if (!this.isConnected || !this.client) return null;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis GET error:', error.message);
      return null;
    }
  }

  // Set data in Redis with optional expiration
  async set(key, data, expireInSeconds = 3600) {
    try {
      if (!this.isConnected || !this.client) return false;
      await this.client.setEx(key, expireInSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Redis SET error:', error.message);
      return false;
    }
  }

  // Delete data from Redis
  async del(key) {
    try {
      if (!this.isConnected || !this.client) return false;
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error.message);
      return false;
    }
  }

  // Check if key exists
  async exists(key) {
    try {
      if (!this.isConnected || !this.client) return false;
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error.message);
      return false;
    }
  }

  // Get multiple keys
  async mget(keys) {
    try {
      if (!this.isConnected || !this.client || !keys.length) return [];
      const results = await this.client.mGet(keys);
      return results.map(result => result ? JSON.parse(result) : null);
    } catch (error) {
      console.error('Redis MGET error:', error.message);
      return [];
    }
  }

  // Set multiple keys
  async mset(keyValuePairs, expireInSeconds = 3600) {
    try {
      if (!this.isConnected || !this.client) return false;
      
      const pipeline = this.client.multi();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        pipeline.setEx(key, expireInSeconds, JSON.stringify(value));
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Redis MSET error:', error.message);
      return false;
    }
  }

  // Clear all cache (use with caution)
  async flushAll() {
    try {
      if (!this.isConnected || !this.client) return false;
      await this.client.flushAll();
      return true;
    } catch (error) {
      console.error('Redis FLUSHALL error:', error.message);
      return false;
    }
  }

  // Get cache statistics
  async getStats() {
    try {
      if (!this.isConnected || !this.client) return null;
      const info = await this.client.info('memory');
      return {
        connected: this.isConnected,
        memoryUsage: info
      };
    } catch (error) {
      console.error('Redis STATS error:', error.message);
      return null;
    }
  }

  // 🎯 ADVANCED REDIS FEATURES

  // 1️⃣ Session Management
  async setSession(userId, token, ttlSeconds = 3600) {
    try {
      if (!this.isConnected || !this.client) return false;
      const sessionKey = `session:${userId}`;
      await this.client.setEx(sessionKey, ttlSeconds, token);
      console.log(`✅ Session stored for user ${userId} (TTL: ${ttlSeconds}s)`);
      return true;
    } catch (error) {
      console.error('Redis session SET error:', error.message);
      return false;
    }
  }

  async getSession(userId) {
    try {
      if (!this.isConnected || !this.client) return null;
      const sessionKey = `session:${userId}`;
      const token = await this.client.get(sessionKey);
      return token;
    } catch (error) {
      console.error('Redis session GET error:', error.message);
      return null;
    }
  }

  async deleteSession(userId) {
    try {
      if (!this.isConnected || !this.client) return false;
      const sessionKey = `session:${userId}`;
      await this.client.del(sessionKey);
      console.log(`🗑️ Session deleted for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Redis session DELETE error:', error.message);
      return false;
    }
  }

  // 2️⃣ Health Data Caching
  async setHealthData(userId, healthData, ttlSeconds = 1800) {
    try {
      if (!this.isConnected || !this.client) return false;
      const healthKey = `healthData:${userId}`;
      const dataWithTimestamp = {
        ...healthData,
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString()
      };
      await this.client.setEx(healthKey, ttlSeconds, JSON.stringify(dataWithTimestamp));
      console.log(`📊 Health data cached for user ${userId} (TTL: ${ttlSeconds}s)`);
      return true;
    } catch (error) {
      console.error('Redis health data SET error:', error.message);
      return false;
    }
  }

  async getHealthData(userId) {
    try {
      if (!this.isConnected || !this.client) return null;
      const healthKey = `healthData:${userId}`;
      const data = await this.client.get(healthKey);
      if (data) {
        const parsedData = JSON.parse(data);
        console.log(`📊 Health data cache HIT for user ${userId}`);
        return parsedData;
      }
      console.log(`📊 Health data cache MISS for user ${userId}`);
      return null;
    } catch (error) {
      console.error('Redis health data GET error:', error.message);
      return null;
    }
  }

  // 3️⃣ Calorie Calculation Caching
  async setCaloricResult(bmi, diseaseTypes, calorieData, ttlSeconds = 7200) {
    try {
      if (!this.isConnected || !this.client) return false;
      
      // Create a normalized key from BMI and diseases
      const bmiRange = Math.floor(bmi / 2.5) * 2.5; // Group BMI in 2.5 ranges
      const diseaseKey = Array.isArray(diseaseTypes) 
        ? diseaseTypes.sort().join(',') 
        : diseaseTypes || 'none';
      
      const cacheKey = `calorie:${bmiRange}:${diseaseKey}`;
      
      const resultData = {
        bmiRange,
        diseases: diseaseTypes,
        result: calorieData,
        cachedAt: new Date().toISOString(),
        hitCount: 1
      };

      // Check if key exists to increment hit count
      const existing = await this.client.get(cacheKey);
      if (existing) {
        const existingData = JSON.parse(existing);
        resultData.hitCount = (existingData.hitCount || 0) + 1;
      }

      await this.client.setEx(cacheKey, ttlSeconds, JSON.stringify(resultData));
      console.log(`🧮 Calorie result cached (BMI: ${bmiRange}, Diseases: ${diseaseKey}, Hits: ${resultData.hitCount})`);
      return true;
    } catch (error) {
      console.error('Redis calorie cache SET error:', error.message);
      return false;
    }
  }

  async getCaloricResult(bmi, diseaseTypes) {
    try {
      if (!this.isConnected || !this.client) return null;
      
      const bmiRange = Math.floor(bmi / 2.5) * 2.5;
      const diseaseKey = Array.isArray(diseaseTypes) 
        ? diseaseTypes.sort().join(',') 
        : diseaseTypes || 'none';
      
      const cacheKey = `calorie:${bmiRange}:${diseaseKey}`;
      const data = await this.client.get(cacheKey);
      
      if (data) {
        const parsedData = JSON.parse(data);
        console.log(`🧮 Calorie cache HIT (BMI: ${bmiRange}, Diseases: ${diseaseKey}, Hits: ${parsedData.hitCount})`);
        return parsedData.result;
      }
      
      console.log(`🧮 Calorie cache MISS (BMI: ${bmiRange}, Diseases: ${diseaseKey})`);
      return null;
    } catch (error) {
      console.error('Redis calorie cache GET error:', error.message);
      return null;
    }
  }

  // 🔥 Cache Analytics
  async getCacheAnalytics() {
    try {
      if (!this.isConnected || !this.client) return null;
      
      const sessionKeys = await this.client.keys('session:*');
      const healthKeys = await this.client.keys('healthData:*');
      const calorieKeys = await this.client.keys('calorie:*');
      
      return {
        activeSessions: sessionKeys.length,
        cachedHealthProfiles: healthKeys.length,
        calorieCalculations: calorieKeys.length,
        totalKeys: sessionKeys.length + healthKeys.length + calorieKeys.length
      };
    } catch (error) {
      console.error('Redis analytics error:', error.message);
      return null;
    }
  }

  // Graceful shutdown
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        console.log('🔒 Redis client disconnected gracefully');
      }
    } catch (error) {
      console.error('Redis disconnect error:', error.message);
    }
  }
}

// Create singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;