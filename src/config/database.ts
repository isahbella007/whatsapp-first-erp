import mongoose from 'mongoose';
import config from './index';
import logger from '../utils/logger';

/**
 * Connect to MongoDB database
 */
export const connectDB = async (): Promise<void> => {
  try {
    // Database connection options
    const options = config.database.options as mongoose.ConnectOptions;
    
    // Connect to MongoDB
    const conn = await mongoose.connect(config.database.uri, options);
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    const err = error as Error;
    logger.error(`Database Connection Error: ${err.message}`);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB Disconnected');
  } catch (error) {
    const err = error as Error;
    logger.error(`Database Disconnection Error: ${err.message}`);
  }
}; 