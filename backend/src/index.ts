import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { connectDatabases, closeDatabases } from './config/database';
import { ReminderService } from './services/reminder';
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

// Security middleware
app.use(securityMiddleware);
app.use(compressionMiddleware);
app.use(rateLimitMiddleware);
app.use(sanitizeInput);
app.use(validateContentType);

app.use('/api', routes);

// Widget static files
app.use('/widget', express.static('public/widget'));

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinRestaurant', (restaurantId) => {
    socket.join(`restaurant-${restaurantId}`);
    console.log(`Socket ${socket.id} joined restaurant ${restaurantId}`);
  });

  socket.on('leaveRestaurant', (restaurantId) => {
    socket.leave(`restaurant-${restaurantId}`);
    console.log(`Socket ${socket.id} left restaurant ${restaurantId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  // Stop reminder service
  ReminderService.stop();

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

    // Start reminder service for automated notifications
    ReminderService.start();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📖 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📧 Reminder service started`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export default app;
