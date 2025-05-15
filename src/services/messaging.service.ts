// !IMPORTANT:: mark to delete once final test is done cos I am using twilio 

import config from '../config';
import logger from '../utils/logger';
import AppError from '../utils/errors/AppError';
import wasenderService from './whatsapp.service';
import twilioService from './twilio.service';
import { WhatsAppMessageType } from '../interfaces/whatsapp.interface';

/**
 * Unified Messaging Service that can switch between different providers
 */
class MessagingService {
  private provider: string;

  constructor() {
    this.provider = config.messaging.defaultProvider;
    logger.info(`Messaging service initialized with provider: ${this.provider}`);
  }

  /**
   * Set the active messaging provider
   * @param provider The provider to use ('wasender' or 'twilio')
   */
  setProvider(provider: 'wasender' | 'twilio') {
    if (provider !== 'wasender' && provider !== 'twilio') {
      throw new AppError(`Invalid messaging provider: ${provider}`, 400);
    }
    
    this.provider = provider;
    logger.info(`Messaging provider changed to: ${this.provider}`);
    return { provider: this.provider };
  }

  /**
   * Get the current messaging provider
   */
  getProvider() {
    return { provider: this.provider };
  }

  /**
   * Send a text message
   * @param to Recipient phone number
   * @param message Text message to send
   * @param sessionId Optional session ID (for Wasender)
   */
  async sendTextMessage(to: string, message: string, sessionId?: string) {
    try {
      if (this.provider === 'wasender') {
        if (!sessionId) {
          throw new AppError('Session ID is required for Wasender provider', 400);
        }
        return await wasenderService.sendTextMessage(to, message, sessionId);
      } else {
        return await twilioService.sendTextMessage(to, message);
      }
    } catch (error: any) {
      logger.error(`Error sending text message with ${this.provider}:`, error);
      throw new AppError(`Failed to send message: ${error.message}`, error.statusCode || 500);
    }
  }

  /**
   * Send an image message
   * @param to Recipient phone number
   * @param imageUrl URL of the image
   * @param caption Optional caption for the image
   * @param sessionId Optional session ID (for Wasender)
   */
  async sendImageMessage(to: string, imageUrl: string, caption: string = '', sessionId?: string) {
    try {
      if (this.provider === 'wasender') {
        if (!sessionId) {
          throw new AppError('Session ID is required for Wasender provider', 400);
        }
        return await wasenderService.sendImageMessage(to, imageUrl, caption, sessionId);
      } else {
        return await twilioService.sendImageMessage(to, imageUrl, caption);
      }
    } catch (error: any) {
      logger.error(`Error sending image message with ${this.provider}:`, error);
      throw new AppError(`Failed to send image: ${error.message}`, error.statusCode || 500);
    }
  }

  /**
   * Send a document message
   * @param to Recipient phone number
   * @param documentUrl URL of the document
   * @param filename Filename for the document
   * @param sessionId Optional session ID (for Wasender)
   */
  async sendDocumentMessage(to: string, documentUrl: string, filename: string, sessionId?: string) {
    try {
      if (this.provider === 'wasender') {
        if (!sessionId) {
          throw new AppError('Session ID is required for Wasender provider', 400);
        }
        return await wasenderService.sendDocumentMessage(to, documentUrl, filename, sessionId);
      } else {
        return await twilioService.sendDocumentMessage(to, documentUrl, filename);
      }
    } catch (error: any) {
      logger.error(`Error sending document message with ${this.provider}:`, error);
      throw new AppError(`Failed to send document: ${error.message}`, error.statusCode || 500);
    }
  }

  /**
   * Process webhook events based on the provider
   * @param data Webhook data
   * @param provider Optional explicit provider to handle this webhook
   */
  async processWebhook(data: any, provider?: 'wasender' | 'twilio') {
    try {
      const activeProvider = provider || this.provider;
      
      if (activeProvider === 'wasender') {
        return await wasenderService.processWebhookEvent(data);
      } else {
        return await twilioService.processWebhook(data);
      }
    } catch (error: any) {
      logger.error(`Error processing webhook with ${this.provider}:`, error);
      throw new AppError(`Failed to process webhook: ${error.message}`, error.statusCode || 500);
    }
  }

  /**
   * Create a new WhatsApp session (Wasender only)
   * @param name Session name
   * @param phone Phone number
   * @param webhookUrl Webhook URL for notifications
   */
  async createSession(name: string, phone: string, webhookUrl?: string) {
    try {
      if (this.provider === 'wasender') {
        return await wasenderService.createSession(name, phone, webhookUrl);
      } else {
        throw new AppError('Session creation is only available with Wasender provider', 400);
      }
    } catch (error: any) {
      logger.error(`Error creating session with ${this.provider}:`, error);
      throw new AppError(`Failed to create session: ${error.message}`, error.statusCode || 500);
    }
  }
}

export default new MessagingService(); 