const redisClient = require('../config/redis');

/**
 * Redis caching middleware for Express routes
 * @param {number} expireInSeconds - Cache expiration time in seconds (default: 1 hour)
 * @param {function} keyGenerator - Function to generate cache key from request
 */
const cache = (expireInSeconds = 3600, keyGenerator = null) => {
  return async (req, res, next) => {
    try {
      // Skip caching if Redis is not connected
      if (!redisClient.isConnected) {
        return next();
      }

      // Generate cache key
      let cacheKey;
      if (keyGenerator && typeof keyGenerator === 'function') {
        cacheKey = keyGenerator(req);
      } else {
        // Default key generation
        const userId = req.user?._id || req.user?.userId || 'anonymous';
        const path = req.originalUrl || req.path;
        cacheKey = `cache:${userId}:${path}`;
      }

      // Try to get data from cache
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        console.log('✅ Cache HIT:', cacheKey);
        return res.json(cachedData);
      }

      console.log('❌ Cache MISS:', cacheKey);

      // Store original res.json method
      const originalJson = res.json;

      // Override res.json to cache the response
      res.json = function(data) {
        // Cache the response data
        redisClient.set(cacheKey, data, expireInSeconds).catch(err => {
          console.error('Failed to cache data:', err.message);
        });

        // Call original json method
        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error.message);
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Cache invalidation middleware
 * Removes cached data for specific patterns
 */
const invalidateCache = (patterns) => {
  return async (req, res, next) => {
    try {
      if (!redisClient.isConnected) {
        return next();
      }

      const userId = req.user?._id || req.user?.userId;
      if (!userId) {
        return next();
      }

      // Store original methods
      const originalJson = res.json;
      const originalSend = res.send;

      // Override response methods to invalidate cache after successful operations
      const invalidateAfterResponse = function(data) {
        // Only invalidate on successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          patterns.forEach(async (pattern) => {
            try {
              const fullPattern = pattern.replace(':userId', userId);
              // Note: Redis doesn't have native pattern deletion
              // For now, we'll delete specific known keys
              const keysToDelete = [
                `cache:${userId}:/api/health/metrics`,
                `cache:${userId}:/api/health/diseases`,
                `cache:${userId}:/api/health/medications`,
                `cache:${userId}:/api/health/summary`,
                `cache:${userId}:/api/meals/daily`,
                `cache:${userId}:/api/meals/weekly`,
                `cache:${userId}:/api/ai/recommendations`
              ];

              for (const key of keysToDelete) {
                if (key.includes(fullPattern.replace('cache:', '').replace(':userId:', userId))) {
                  await redisClient.del(key);
                }
              }
            } catch (error) {
              console.error('Cache invalidation error:', error.message);
            }
          });
        }

        // Call original method
        return originalJson.call(this, data);
      };

      res.json = invalidateAfterResponse;
      res.send = function(data) {
        invalidateAfterResponse.call(this, data);
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache invalidation middleware error:', error.message);
      next();
    }
  };
};

/**
 * User-specific cache key generator
 */
const userCacheKey = (endpoint) => {
  return (req) => {
    const userId = req.user?._id || req.user?.userId;
    return `cache:user:${userId}:${endpoint}`;
  };
};

/**
 * Health data cache key generator
 */
const healthCacheKey = (dataType) => {
  return (req) => {
    const userId = req.user?._id || req.user?.userId;
    return `cache:health:${userId}:${dataType}`;
  };
};

/**
 * Meal data cache key generator
 */
const mealCacheKey = (timeframe) => {
  return (req) => {
    const userId = req.user?._id || req.user?.userId;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    return `cache:meals:${userId}:${timeframe}:${date}`;
  };
};

/**
 * Cache warming function - preload frequently accessed data
 */
const warmCache = async (userId, userData) => {
  try {
    if (!redisClient.isConnected) return;

    const cachePromises = [
      // Cache user health metrics
      redisClient.set(
        `cache:health:${userId}:metrics`,
        userData.healthMetrics,
        3600 // 1 hour
      ),
      
      // Cache user diseases
      redisClient.set(
        `cache:health:${userId}:diseases`,
        userData.diseases,
        3600 // 1 hour
      ),
      
      // Cache active medications
      redisClient.set(
        `cache:health:${userId}:medications`,
        userData.medications.filter(m => m.active),
        3600 // 1 hour
      )
    ];

    await Promise.all(cachePromises);
    console.log('🔥 Cache warmed for user:', userId);
  } catch (error) {
    console.error('Cache warming error:', error.message);
  }
};

module.exports = {
  cache,
  invalidateCache,
  userCacheKey,
  healthCacheKey,
  mealCacheKey,
  warmCache
};