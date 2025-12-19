const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const redisClient = require('./config/redis');
require('dotenv').config();

// Add process error handlers
process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');
const aiRoutes = require('./routes/ai');
const mealsRoutes = require('./routes/meals');
const redisAnalyticsRoutes = require('./routes/redis-analytics');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002'
    ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`, req.body ? JSON.stringify(req.body) : 'No body');
  next();
});

// Initialize Redis connection
async function initializeRedis() {
  try {
    await redisClient.connect();
  } catch (error) {
    console.log('⚠️  Redis initialization failed, continuing without cache:', error.message);
  }
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/health-guard')
  .then(async () => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📦 Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/health-guard'}`);

    // Initialize Redis after MongoDB connection
    await initializeRedis();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('\n🔧 Quick fixes:');
    console.log('1. Start local MongoDB: mongod');
    console.log('2. Use MongoDB Atlas: Update MONGODB_URI in .env');
    console.log('3. Install MongoDB: https://www.mongodb.com/try/download/community');
    console.log('\n⚠️  Server will continue but registration/login will fail without database\n');
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes); // Handle proxy-rewritten paths
app.use('/api/health', healthRoutes);
app.use('/health', healthRoutes); // Handle proxy-rewritten paths
app.use('/api/ai', aiRoutes);
app.use('/ai', aiRoutes); // Handle proxy-rewritten paths
app.use('/api/meals', mealsRoutes);
app.use('/meals', mealsRoutes); // Handle proxy-rewritten paths
const adminRoutes = require('./routes/admin');
// ... other imports ...

// Routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes); // Handle proxy-rewritten paths
app.use('/api/health', healthRoutes);
app.use('/health', healthRoutes); // Handle proxy-rewritten paths
app.use('/api/ai', aiRoutes);
app.use('/ai', aiRoutes); // Handle proxy-rewritten paths
app.use('/api/meals', mealsRoutes);
app.use('/meals', mealsRoutes); // Handle proxy-rewritten paths

// Admin Routes (User Management & Stats)
app.use('/api/admin', adminRoutes);

// Redis Analytics (Moved to specific path to avoid conflict/provide clarity)
app.use('/api/admin/redis', redisAnalyticsRoutes);
app.use('/admin/redis', redisAnalyticsRoutes);

// Health check endpoint
app.get('/api/health-check', (req, res) => {
  res.status(200).json({
    message: 'Health Guard API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Root route for welcome message
app.get('/', (req, res) => {
  res.status(200).send('API is running 🚀. Access endpoints at /api/...');
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

// Use 0.0.0.0 to allow external connections (needed for deployment)
// In development, this still works fine on localhost
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.log(`🔧 Port ${PORT} is already in use. Try a different port.`);
  }
});
