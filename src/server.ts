import app from './app';
import { connectDB } from './config/database';
import config from './config';
import logger from './utils/logger';
import redisClient from './config/redis';

// Uncaught exception handler
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  logger.error(err.stack);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Redis (the Redis client connects on first use)
    logger.info('Redis client initialized');

    // Start Express server
    const PORT = config.server.port;
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${config.server.env} mode on port ${PORT}`);
    });

    // Unhandled rejection handler
    process.on('unhandledRejection', (err: Error) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
      logger.error(err.name, err.message);
      logger.error(err.stack);
      
      // Close server and exit
      server.close(() => {
        process.exit(1);
      });
    });

    // SIGTERM handler
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
      });
    });
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

// Start the server
startServer(); 