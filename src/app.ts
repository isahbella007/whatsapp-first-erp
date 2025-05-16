import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './utils/errors/errorHandler';
import logger from './utils/logger';
import config from './config';
import { commandRegistryService } from './services/command-registry.service';

// Initialize Express app
const app: Application = express();


// Security HTTP headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  max: 100, // Max 100 requests per IP per window
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many requests from this IP, please try again later.',
});

// Apply rate limiting to all routes
app.use('/api', limiter);

// Enable trust proxy - Important for working with ngrok
app.set('trust proxy', 1);

// Security HTTP headers
app.use(helmet());
// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
app.use(cors());

// Compression
app.use(compression());

// Logging
if (config.server.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan(config.logging.format));
}

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    environment: config.server.env,
    timestamp: new Date().toISOString(),
  });
});


// Initialize command registry
commandRegistryService.registerCommands();
logger.info('Command registry initialized');


// Add a webhook route specifically for Twilio
app.post('/webhook/twilio', express.urlencoded({ extended: true }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhookData = req.body;
    
    // Log the incoming webhook
    logger.info('Received Twilio webhook', {
      from: webhookData.From,
      body: webhookData.Body,
      numMedia: webhookData.NumMedia,
    });
    
    // Process the webhook asynchronously
    import('./services/twilio.service').then(async (module) => {
      const twilioService = module.default;
      await twilioService.processWebhook(webhookData);
    }).catch((error) => {
      logger.error('Error processing Twilio webhook:', error);
    });
    
    // Respond immediately with 200 OK to Twilio
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

// 404 handler - use a different approach
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = config.server.port || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;
