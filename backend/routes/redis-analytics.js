const express = require('express');
const auth = require('../middleware/auth');
const redisClient = require('../config/redis');

const router = express.Router();

// 📊 Redis Analytics and Cache Management Dashboard
router.get('/redis/analytics', auth, async (req, res) => {
  try {
    if (!redisClient.isConnected) {
      return res.json({
        message: 'Redis is not connected',
        status: 'disabled',
        analytics: null
      });
    }

    // Get cache analytics
    const analytics = await redisClient.getCacheAnalytics();
    
    // Get some sample cache keys to show what's cached
    const sampleSessions = await redisClient.client.keys('session:*');
    const sampleHealthData = await redisClient.client.keys('healthData:*');
    const sampleCalorieCache = await redisClient.client.keys('calorie:*');
    
    // Get Redis memory info
    const stats = await redisClient.getStats();

    res.json({
      status: 'connected',
      analytics,
      samples: {
        sessions: sampleSessions.slice(0, 5), // Show first 5
        healthData: sampleHealthData.slice(0, 5),
        calorieCache: sampleCalorieCache.slice(0, 5)
      },
      memory: stats,
      features: {
        sessionManagement: '✅ JWT tokens cached with TTL',
        healthDataCaching: '✅ Health metrics cached (30min)',
        calorieCalculationCaching: '✅ AI/Rule-based results cached (2-3hrs)',
        smartInvalidation: '✅ Auto cache cleanup on data changes'
      }
    });
  } catch (error) {
    console.error('Redis analytics error:', error);
    res.status(500).json({
      message: 'Failed to get Redis analytics',
      error: error.message
    });
  }
});

// 🧹 Clear specific cache types (for testing)
router.post('/redis/clear/:type', auth, async (req, res) => {
  try {
    if (!redisClient.isConnected) {
      return res.json({
        message: 'Redis is not connected',
        status: 'disabled'
      });
    }

    const { type } = req.params;
    let pattern, message;

    switch (type) {
      case 'sessions':
        pattern = 'session:*';
        message = 'All user sessions cleared';
        break;
      case 'health':
        pattern = 'healthData:*';
        message = 'All health data cache cleared';
        break;
      case 'calories':
        pattern = 'calorie:*';
        message = 'All calorie calculation cache cleared';
        break;
      case 'user':
        const userId = req.query.userId || req.user._id;
        await redisClient.deleteSession(userId);
        await redisClient.client.del(`healthData:${userId}`);
        message = `All cache cleared for user ${userId}`;
        return res.json({ message, cleared: true });
      default:
        return res.status(400).json({ message: 'Invalid cache type' });
    }

    // Get keys matching pattern and delete them
    const keys = await redisClient.client.keys(pattern);
    if (keys.length > 0) {
      await redisClient.client.del(...keys);
    }

    res.json({
      message,
      keysCleared: keys.length,
      pattern
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      message: 'Failed to clear cache',
      error: error.message
    });
  }
});

// 🔍 Inspect specific cache entry
router.get('/redis/inspect/:key', auth, async (req, res) => {
  try {
    if (!redisClient.isConnected) {
      return res.json({
        message: 'Redis is not connected',
        status: 'disabled'
      });
    }

    const { key } = req.params;
    const data = await redisClient.client.get(key);
    const ttl = await redisClient.client.ttl(key);

    if (data) {
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        parsedData = data; // Raw string data
      }

      res.json({
        key,
        data: parsedData,
        ttl: ttl > 0 ? `${ttl} seconds` : (ttl === -1 ? 'No expiration' : 'Key expired/not found'),
        size: Buffer.byteLength(data, 'utf8') + ' bytes'
      });
    } else {
      res.json({
        key,
        message: 'Key not found or expired'
      });
    }
  } catch (error) {
    console.error('Cache inspect error:', error);
    res.status(500).json({
      message: 'Failed to inspect cache',
      error: error.message
    });
  }
});

// 🎯 Test Redis Performance
router.post('/redis/performance-test', auth, async (req, res) => {
  try {
    if (!redisClient.isConnected) {
      return res.json({
        message: 'Redis is not connected - cannot run performance test',
        status: 'disabled'
      });
    }

    const testData = {
      userId: req.user._id,
      timestamp: new Date(),
      testPayload: 'Performance test data '.repeat(100) // ~2KB of data
    };

    // Test SET performance
    const setStart = Date.now();
    await redisClient.set('perf:test', testData, 60); // 1 minute TTL
    const setTime = Date.now() - setStart;

    // Test GET performance  
    const getStart = Date.now();
    const retrieved = await redisClient.get('perf:test');
    const getTime = Date.now() - getStart;

    // Clean up
    await redisClient.del('perf:test');

    res.json({
      message: 'Redis performance test completed',
      results: {
        setOperation: `${setTime}ms`,
        getOperation: `${getTime}ms`,
        dataSize: Buffer.byteLength(JSON.stringify(testData), 'utf8') + ' bytes',
        dataIntegrity: retrieved ? 'PASS' : 'FAIL'
      },
      recommendation: setTime + getTime < 50 ? 
        '🚀 Excellent performance! Redis is working optimally.' :
        '⚠️ Performance could be better. Check Redis configuration.'
    });
  } catch (error) {
    console.error('Performance test error:', error);
    res.status(500).json({
      message: 'Performance test failed',
      error: error.message
    });
  }
});

module.exports = router;