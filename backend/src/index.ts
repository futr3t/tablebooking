import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { connectDatabases, closeDatabases } from './config/database';
import routes from './routes';
import {
  securityMiddleware,
  compressionMiddleware,
  rateLimitMiddleware,
  sanitizeInput,
  validateContentType
} from './middleware/security';
import {
  errorHandler,
  notFoundHandler
} from './middleware/error';

dotenv.config();

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 3001;

const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    credentials: true
  }
});

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Temporarily disable problematic middleware for Railway debugging
// app.use(securityMiddleware);
// app.use(compressionMiddleware);  
// app.use(rateLimitMiddleware);
// app.use(sanitizeInput);
// app.use(validateContentType);

// Add public diagnostic endpoints BEFORE authentication
app.get('/api/debug-login', async (req, res) => {
  const diagnostics: any = {
    server: {
      status: 'running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'not set',
      port: process.env.PORT || 'not set'
    },
    criticalEnvironment: {
      JWT_SECRET_SET: !!process.env.JWT_SECRET,
      JWT_SECRET_LENGTH: process.env.JWT_SECRET?.length || 0,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'not set (defaults to http://localhost:3000)',
      CORS_ORIGINS_ARRAY: process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || ['http://localhost:3000']
    },
    request: {
      origin: req.headers.origin || 'no origin header',
      referer: req.headers.referer || 'no referer header',
      host: req.headers.host || 'no host header',
      method: req.method,
      url: req.url
    },
    issues: []
  };

  // Check critical environment variables
  if (!process.env.JWT_SECRET) {
    diagnostics.issues.push({
      severity: 'CRITICAL',
      issue: 'JWT_SECRET is not set',
      solution: 'Set JWT_SECRET environment variable in Railway backend service',
      railwayInstructions: 'Railway → Backend Service → Variables → Add: JWT_SECRET=your-secret-key'
    });
  }

  if (!process.env.DATABASE_URL) {
    diagnostics.issues.push({
      severity: 'CRITICAL', 
      issue: 'DATABASE_URL is not set',
      solution: 'Ensure PostgreSQL database is linked to backend service in Railway'
    });
  }

  // Check CORS configuration
  const requestOrigin = req.headers.origin;
  if (requestOrigin) {
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:3000'];
    
    if (!allowedOrigins.includes(requestOrigin)) {
      diagnostics.issues.push({
        severity: 'CRITICAL',
        issue: `CORS mismatch: Frontend origin '${requestOrigin}' not in allowed origins`,
        solution: `Set CORS_ORIGIN=${requestOrigin} in Railway backend environment variables`,
        currentAllowedOrigins: allowedOrigins,
        railwayInstructions: `Railway → Backend Service → Variables → Add: CORS_ORIGIN=${requestOrigin}`
      });
    }
  }

  diagnostics.recommendedFix = {
    step1: 'Go to Railway → Backend Service → Variables',
    step2: 'Add: JWT_SECRET=8f7d6a5s4d3f2g1h0j9k8l7m6n5p4q3r2s1t0u9v8w7x6y5z4',
    step3: `Add: CORS_ORIGIN=${requestOrigin || 'https://your-frontend-url.railway.app'}`,
    step4: 'Wait 2-3 minutes for redeploy, then try login again'
  };

  res.json({
    success: diagnostics.issues.filter(i => i.severity === 'CRITICAL').length === 0,
    data: diagnostics,
    summary: `${diagnostics.issues.length} issues found (${diagnostics.issues.filter(i => i.severity === 'CRITICAL').length} critical)`
  });
});

// Add table diagnostic endpoint
app.get('/api/debug-tables', async (req, res) => {
  try {
    const { db } = require('./config/database');
    
    // Check if tables table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tables'
      );
    `);
    
    // Get table structure if it exists
    let columns = [];
    if (tableExists.rows[0].exists) {
      const columnResult = await db.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tables' 
        ORDER BY ordinal_position;
      `);
      columns = columnResult.rows;
    }
    
    // Get sample tables if any exist
    let sampleTables = [];
    let tableCount = 0;
    if (tableExists.rows[0].exists) {
      const countResult = await db.query('SELECT COUNT(*) as count FROM tables');
      tableCount = parseInt(countResult.rows[0].count);
      
      if (tableCount > 0) {
        const sampleResult = await db.query('SELECT * FROM tables LIMIT 3');
        sampleTables = sampleResult.rows;
      }
    }
    
    res.json({
      success: true,
      data: {
        tableExists: tableExists.rows[0].exists,
        tableCount,
        columns,
        sampleTables,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Migration endpoint for missing table columns
app.post('/api/migrate-tables', async (req, res) => {
  try {
    const { db } = require('./config/database');
    
    // Add missing columns
    const migrations = [
      "ALTER TABLE tables ADD COLUMN IF NOT EXISTS table_type VARCHAR(50) DEFAULT 'standard'",
      "ALTER TABLE tables ADD COLUMN IF NOT EXISTS notes TEXT",
      "ALTER TABLE tables ADD COLUMN IF NOT EXISTS location_notes VARCHAR(255)",
      "ALTER TABLE tables ADD COLUMN IF NOT EXISTS is_combinable BOOLEAN DEFAULT true",
      "ALTER TABLE tables ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0"
    ];
    
    const updates = [
      "UPDATE tables SET table_type = 'standard' WHERE table_type IS NULL",
      "UPDATE tables SET is_combinable = true WHERE is_combinable IS NULL",
      "UPDATE tables SET priority = 0 WHERE priority IS NULL"
    ];
    
    const results = [];
    
    // Run migrations
    for (const migration of migrations) {
      try {
        await db.query(migration);
        results.push({ query: migration, status: 'success' });
      } catch (error) {
        results.push({ query: migration, status: 'error', error: error.message });
      }
    }
    
    // Run updates
    for (const update of updates) {
      try {
        const result = await db.query(update);
        results.push({ query: update, status: 'success', rowsAffected: result.rowCount });
      } catch (error) {
        results.push({ query: update, status: 'error', error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: 'Table migration completed',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

app.use('/api', routes);

// Also serve widget at root level for easier access
app.use('/', routes);

app.use(notFoundHandler);
app.use(errorHandler);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-restaurant', (restaurantId: string) => {
    socket.join(`restaurant-${restaurantId}`);
    console.log(`Socket ${socket.id} joined restaurant ${restaurantId}`);
  });

  socket.on('leave-restaurant', (restaurantId: string) => {
    socket.leave(`restaurant-${restaurantId}`);
    console.log(`Socket ${socket.id} left restaurant ${restaurantId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    try {
      await closeDatabases();
      console.log('Database connections closed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const startServer = async () => {
  try {
    await connectDatabases();
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📖 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export { app, io };