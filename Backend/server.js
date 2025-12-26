const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
require('dotenv').config();



console.log('🔑 Gemini API Key:', process.env.GEMINI_API_KEY ? 'Loaded ✅' : 'Missing ❌');


const routes = require('./routes');

const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== Middleware ====================

// Security
app.use(helmet({
  frameguard: false,
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      frameAncestors: ["'self'", "http://localhost:5173", "http://localhost:5174"]
    }
  }
}));



// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ==================== Routes ====================

app.use('/api', routes);


// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'RAG Chatbot API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      documents: '/api/documents',
      chat: '/api/chat',
      health: '/api/health'
    }
  });
});

// ==================== Error Handling ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large. Maximum size is 10MB' });
    }
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== Server Startup ====================

async function startServer() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Start server
    app.listen(PORT, () => {
      console.log('🚀 Server started successfully!');
      console.log(`📡 API running on http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️ SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️ SIGINT received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

startServer();