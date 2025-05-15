// !IMPORTANT:: mark to delete once final test is done cos I am using twilio 

import axios from 'axios';
import crypto from 'crypto';
import config from '../config';
import logger from '../utils/logger';
import AppError from '../utils/errors/AppError';
import { 
  IWhatsAppMessage, 
  WhatsAppMessageType, 
  IWhatsAppWebhookEvent,
  WhatsAppWebhookEventType 
} from '../interfaces/whatsapp.interface';

/**
 * WhatsApp Service for handling WhatsApp messaging through Wasender API
 */
class WhatsAppService {
  private apiKey: string;
  private apiUrl: string;
  private webhookSecret: string;

  constructor() {
    this.apiKey = config.wasender.apiKey;
    this.apiUrl = config.wasender.apiUrl;
    this.webhookSecret = config.wasender.webhookSecret;
  }

  /**
   * Initialize axios instance with authentication
   */
  private getApiClient() {
    return axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
  }

  /**
   * Create a new WhatsApp session
   * @param name Session name
   * @param phone Phone number
   * @param webhookUrl Webhook URL for notifications
   */
  async createSession(name: string, phone: string, webhookUrl?: string) {
    try {
      const client = this.getApiClient();
      
      const response = await client.post('/sessions', {
        name,
        phone,
        message_logging: true,
        account_protection: true,
        webhooks: webhookUrl ? {
          url: webhookUrl,
          events: [
            'message.sent',
            'session.status',
            'messages.upsert'
          ]
        } : undefined
      });

      return response.data;
    } catch (error: any) {
      logger.error('Error creating WhatsApp session:', error.response?.data || error.message);
      throw new AppError('Failed to create WhatsApp session', 500);
    }
  }

  /**
   * Send a text message
   * @param to Recipient phone number
   * @param message Text message to send
   * @param sessionId WhatsApp session ID
   */
  async sendTextMessage(to: string, message: string, sessionId: string) {
    try {
      const client = this.getApiClient();
      
      const response = await client.post('/send/message', {
        session_id: sessionId,
        to,
        type: 'text',
        message: {
          text: message
        }
      });

      return response.data;
    } catch (error: any) {
      logger.error('Error sending WhatsApp text message:', error.response?.data || error.message);
      throw new AppError('Failed to send WhatsApp message', 500);
    }
  }

  /**
   * Send an image message
   * @param to Recipient phone number
   * @param imageUrl URL of the image
   * @param caption Optional caption for the image
   * @param sessionId WhatsApp session ID
   */
  async sendImageMessage(to: string, imageUrl: string, caption: string = '', sessionId: string) {
    try {
      const client = this.getApiClient();
      
      const response = await client.post('/send/message', {
        session_id: sessionId,
        to,
        type: 'image',
        message: {
          image: {
            url: imageUrl,
            caption
          }
        }
      });

      return response.data;
    } catch (error: any) {
      logger.error('Error sending WhatsApp image message:', error.response?.data || error.message);
      throw new AppError('Failed to send WhatsApp image', 500);
    }
  }

  /**
   * Send a document message
   * @param to Recipient phone number
   * @param documentUrl URL of the document
   * @param filename Filename for the document
   * @param sessionId WhatsApp session ID
   */
  async sendDocumentMessage(to: string, documentUrl: string, filename: string, sessionId: string) {
    try {
      const client = this.getApiClient();
      
      const response = await client.post('/send/message', {
        session_id: sessionId,
        to,
        type: 'document',
        message: {
          document: {
            url: documentUrl,
            filename
          }
        }
      });

      return response.data;
    } catch (error: any) {
      logger.error('Error sending WhatsApp document message:', error.response?.data || error.message);
      throw new AppError('Failed to send WhatsApp document', 500);
    }
  }

  /**
   * Verify webhook signature to ensure the request is from Wasender API
   * @param signature Signature from request headers
   */
  verifyWebhookSignature(signature: string) {
    return signature === this.webhookSecret;
  }

  /**
   * Process webhook event from Wasender API
   * @param event Webhook event data
   */
  async processWebhookEvent(event: IWhatsAppWebhookEvent) {
    try {
      logger.info(`Processing WhatsApp webhook event: ${event.type}`);
      
      switch (event.type) {
        case WhatsAppWebhookEventType.MESSAGE_SENT:
          // Handle message sent event
          logger.info(`Message sent: ${event.data.id}`);
          break;
          
        case WhatsAppWebhookEventType.SESSION_STATUS:
          // Handle session status change
          logger.info(`Session status changed to: ${event.data.status}`);
          break;
          
        case WhatsAppWebhookEventType.MESSAGES_UPSERT:
          // Handle new message received
          logger.info(`New message received: ${event.data.key.id}`);
          
          // Process the message content
          await this.processIncomingMessage(event.data);
          break;
          
        default:
          logger.warn(`Unknown webhook event type: ${event.type}`);
      }
      
      return { processed: true };
    } catch (error: any) {
      logger.error('Error processing webhook event:', error);
      throw new AppError('Failed to process webhook event', 500);
    }
  }

  /**
   * Process an incoming message
   * @param messageData Message data from webhook
   */
  private async processIncomingMessage(messageData: any) {
    try {
      // Extract message content and metadata
      const message: IWhatsAppMessage = {
        id: messageData.key.id,
        from: messageData.key.remoteJid,
        to: messageData.key.toJid || '',
        type: this.determineMessageType(messageData),
        content: this.extractMessageContent(messageData),
        timestamp: new Date(messageData.messageTimestamp * 1000),
        sessionId: messageData.sessionId || '',
        metadata: {
          pushName: messageData.pushName,
          isGroup: messageData.isGroup,
        }
      };

      logger.info(`Processing incoming message: ${message.id} from ${message.from}`);
      
      // Here you would implement your bot logic
      // For example, check if it's a command, process uploaded files, etc.
      
      return message;
    } catch (error: any) {
      logger.error('Error processing incoming message:', error);
      throw new AppError('Failed to process incoming message', 500);
    }
  }

  /**
   * Determine the type of the incoming message
   * @param messageData Message data from webhook
   */
  private determineMessageType(messageData: any): WhatsAppMessageType {
    if (messageData.message?.conversation) {
      return WhatsAppMessageType.TEXT;
    } else if (messageData.message?.imageMessage) {
      return WhatsAppMessageType.IMAGE;
    } else if (messageData.message?.documentMessage) {
      return WhatsAppMessageType.DOCUMENT;
    } else if (messageData.message?.audioMessage) {
      return WhatsAppMessageType.AUDIO;
    } else if (messageData.message?.videoMessage) {
      return WhatsAppMessageType.VIDEO;
    } else if (messageData.message?.locationMessage) {
      return WhatsAppMessageType.LOCATION;
    }
    
    return WhatsAppMessageType.TEXT; // Default to text
  }

  /**
   * Extract the content from the message based on its type
   * @param messageData Message data from webhook
   */
  private extractMessageContent(messageData: any): string | Buffer {
    if (messageData.message?.conversation) {
      return messageData.message.conversation;
    } else if (messageData.message?.imageMessage) {
      return messageData.message.imageMessage.url || '';
    } else if (messageData.message?.documentMessage) {
      return messageData.message.documentMessage.url || '';
    } else if (messageData.message?.audioMessage) {
      return messageData.message.audioMessage.url || '';
    } else if (messageData.message?.videoMessage) {
      return messageData.message.videoMessage.url || '';
    } else if (messageData.message?.locationMessage) {
      const location = messageData.message.locationMessage;
      return `${location.degreesLatitude},${location.degreesLongitude}`;
    }
    
    return '';
  }
}

export default new WhatsAppService(); 