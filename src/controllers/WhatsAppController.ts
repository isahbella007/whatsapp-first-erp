import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/errors/errorHandler';
import AppError from '../utils/errors/AppError';
import logger from '../utils/logger';
import messagingService from '../services/messaging.service';

/**
 * WhatsApp Controller for handling WhatsApp API routes
 */
class WhatsAppController {
  /**
   * Process webhook events
   * @route POST /api/whatsapp/webhook
   */
  processWebhook = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Determine provider based on headers or request structure
    const isWasender = req.headers['x-webhook-signature'] !== undefined;
    const provider = isWasender ? 'wasender' : 'twilio';
    
    // Process webhook based on provider
    if (provider === 'wasender') {
      // Verify webhook signature for Wasender
      const signature = req.headers['x-webhook-signature'] as string;
      if (!signature) {
        return next(new AppError('Missing webhook signature', 401));
      }
    }
    
    logger.info(`Processing ${provider} webhook`);
    const result = await messagingService.processWebhook(req.body, provider as any);

    // Send response
    res.status(200).json({
      status: 'success',
      message: 'Webhook processed successfully',
      data: result,
    });
  });

  /**
   * Send a WhatsApp message
   * @route POST /api/whatsapp/send
   */
  sendMessage = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { to, type, message, sessionId } = req.body;
    const provider = req.body.provider || messagingService.getProvider().provider;

    // Validate required fields
    if (!to || !type || !message) {
      return next(new AppError('Missing required fields: to, type, message', 400));
    }

    // Validate session ID if using Wasender
    if (provider === 'wasender' && !sessionId) {
      return next(new AppError('Session ID is required when using Wasender provider', 400));
    }

    // Send message based on type
    let result;
    switch (type) {
      case 'text':
        result = await messagingService.sendTextMessage(to, message, sessionId);
        break;
      case 'image':
        const { url, caption } = message;
        if (!url) {
          return next(new AppError('Image URL is required for image messages', 400));
        }
        result = await messagingService.sendImageMessage(to, url, caption || '', sessionId);
        break;
      case 'document':
        const { url: docUrl, filename } = message;
        if (!docUrl || !filename) {
          return next(new AppError('Document URL and filename are required for document messages', 400));
        }
        result = await messagingService.sendDocumentMessage(to, docUrl, filename, sessionId);
        break;
      default:
        return next(new AppError(`Unsupported message type: ${type}`, 400));
    }

    // Send response
    res.status(200).json({
      status: 'success',
      message: 'Message sent successfully',
      data: result,
    });
  });

  /**
   * Create a new WhatsApp session (Wasender only)
   * @route POST /api/whatsapp/sessions
   */
  createSession = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { name, phone, webhookUrl } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return next(new AppError('Missing required fields: name, phone', 400));
    }

    // Create session
    const session = await messagingService.createSession(name, phone, webhookUrl);

    // Send response
    res.status(201).json({
      status: 'success',
      message: 'WhatsApp session created successfully',
      data: {
        session,
      },
    });
  });

  /**
   * Set active messaging provider
   * @route POST /api/whatsapp/provider
   */
  setProvider = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { provider } = req.body;

    if (!provider || (provider !== 'wasender' && provider !== 'twilio')) {
      return next(new AppError('Invalid provider. Must be "wasender" or "twilio"', 400));
    }

    const result = messagingService.setProvider(provider);

    res.status(200).json({
      status: 'success',
      message: `Provider set to ${provider}`,
      data: result,
    });
  });

  /**
   * Get current messaging provider
   * @route GET /api/whatsapp/provider
   */
  getProvider = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const result = messagingService.getProvider();

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });
}

export default new WhatsAppController(); 