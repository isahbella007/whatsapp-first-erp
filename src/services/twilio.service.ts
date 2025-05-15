import twilio from 'twilio';
import config from '../config';
import logger from '../utils/logger';
import AppError from '../utils/errors/AppError';
import { WhatsAppMessageType } from '../interfaces/whatsapp.interface';
import userService from './user.service';
import receiptService from './receipt.service';
import commandService from './command.service';

/**
 * Twilio Service for WhatsApp messaging - focuses only on message transmission and webhook handling
 */
class TwilioService {
  private client: twilio.Twilio;
  private phoneNumber: string;

  constructor() {
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    this.phoneNumber = config.twilio.phoneNumber;
  }

  /**
   * Send a text message via WhatsApp
   * @param to Recipient phone number
   * @param message Text message to send
   */
  async sendTextMessage(to: string, message: string) {
    try {
      logger.info(`Sending text message to ${to}: ${message}`);
      // Ensure the to number has WhatsApp format
      const formattedTo = this.formatPhoneNumber(to);
      logger.info(`Formatted to: ${formattedTo}`);
      const response = await this.client.messages.create({
        from: `whatsapp:${this.phoneNumber}`,
        to: `whatsapp:${formattedTo}`,
        body: message,
      });

      logger.info(`Twilio WhatsApp message sent with SID: ${response.sid}`);
      return response;
    } catch (error: any) {
      logger.error('Error sending Twilio WhatsApp message:', error);
      throw new AppError(`Failed to send WhatsApp message: ${error.message}`, 500);
    }
  }

  /**
   * Send an image message via WhatsApp
   * @param to Recipient phone number
   * @param imageUrl URL of the image
   * @param caption Optional caption for the image
   */
  async sendImageMessage(to: string, imageUrl: string, caption: string = '') {
    try {
      // Ensure the to number has WhatsApp format
      const formattedTo = this.formatPhoneNumber(to);
      
      const response = await this.client.messages.create({
        from: `whatsapp:${this.phoneNumber}`,
        to: `whatsapp:${formattedTo}`,
        body: caption,
        mediaUrl: [imageUrl],
      });

      logger.info(`Twilio WhatsApp image sent with SID: ${response.sid}`);
      return response;
    } catch (error: any) {
      logger.error('Error sending Twilio WhatsApp image:', error);
      throw new AppError(`Failed to send WhatsApp image: ${error.message}`, 500);
    }
  }

  /**
   * Send a document message via WhatsApp
   * @param to Recipient phone number
   * @param documentUrl URL of the document
   * @param filename Filename for the document
   */
  async sendDocumentMessage(to: string, documentUrl: string, filename: string) {
    try {
      // Ensure the to number has WhatsApp format
      const formattedTo = this.formatPhoneNumber(to);
      
      const response = await this.client.messages.create({
        from: `whatsapp:${this.phoneNumber}`,
        to: `whatsapp:${formattedTo}`,
        body: `Document: ${filename}`,
        mediaUrl: [documentUrl],
      });

      logger.info(`Twilio WhatsApp document sent with SID: ${response.sid}`);
      return response;
    } catch (error: any) {
      logger.error('Error sending Twilio WhatsApp document:', error);
      throw new AppError(`Failed to send WhatsApp document: ${error.message}`, 500);
    }
  }

  /**
   * Process webhook events from Twilio
   * @param webhookData Webhook data from Twilio
   */
  async processWebhook(webhookData: any) {
    try {
      logger.info('Processing Twilio webhook event');
      
      const messageType = webhookData.SmsMessageSid ? 'message' : 'status';
      
      if (messageType === 'message') {
        // Extract message data
        const from = webhookData.From.replace('whatsapp:', '');
        const body = webhookData.Body || '';
        const numMedia = parseInt(webhookData.NumMedia || '0', 10);
        const messageId = webhookData.MessageSid;
        
        // Format phone number for consistency
        const formattedPhone = this.formatPhoneNumber(from);
        
        // Process incoming message based on content
        if (numMedia > 0) {
          // Handle media messages (images, documents, etc.)
          const mediaType = webhookData.MediaContentType0;
          const mediaUrl = webhookData.MediaUrl0;
          
          logger.info(`Received media message from ${formattedPhone}`, {
            type: mediaType,
            url: mediaUrl,
            messageId,
          });
          
          // Check if this is a payment receipt (image/pdf)
          if (mediaType.startsWith('image/') || mediaType === 'application/pdf') {
            await this.processPaymentReceipt(formattedPhone, mediaUrl);
          } else {
            // Unsupported media type
            const userData = await userService.checkUserInRedis(formattedPhone);
            
            if (userData) {
              // Increment media type error attempts
              const failedAttempts = userData.failed_attempts + 1;
              await userService.updateUserInRedis(formattedPhone, {
                failed_attempts: failedAttempts,
              });
              
              let message = "Sorry, we only accept images or PDF files as payment receipts.";
              
              if (failedAttempts >= 3) {
                // Too many failed attempts, set cooldown
                await receiptService.setUserCooldown(formattedPhone);
                const cooldownMinutes = Math.floor(config.redis.cooldownTime / 60);
                message += `\n\nYou've made too many incorrect attempts. Please wait ${cooldownMinutes} minutes before trying again.`;
              } else {
                message += `\n\nAttempt ${failedAttempts}/3.`;
              }
              
              await this.sendTextMessage(formattedPhone, message);
            } else {
              // No user data found, just send basic message
              await this.sendTextMessage(
                formattedPhone,
                "Sorry, we only accept images or PDF files as payment receipts."
              );
            }
          }
        } else {
          // Handle text messages
          logger.info(`Received text message from ${formattedPhone}: ${body}`, { messageId });
          await this.processTextMessage(formattedPhone, body);
        }
      } else if (messageType === 'status') {
        // Handle status updates
        logger.info(`Message status update: ${webhookData.MessageStatus}`, {
          messageSid: webhookData.MessageSid,
        });
      }
      
      return { processed: true };
    } catch (error: any) {
      logger.error('Error processing Twilio webhook:', error);
      throw new AppError(`Failed to process webhook: ${error.message}`, 500);
    }
  }

  /**
   * Process a text message from a user - just determines user status and passes to command service if active
   * @param phone User's phone number
   * @param message Text message content
   */
  private async processTextMessage(phone: string, message: string) {
    try {
      // Check if the user exists in Redis
      let userData = await userService.checkUserInRedis(phone);

      // If user doesn't exist in Redis, create a new entry
      if (!userData) {
        userData = await userService.createUserInRedis(phone);
        
        // Also create or retrieve MongoDB user record
        await userService.findOrCreateUser(phone);
        
        // Send welcome message for new users
        await this.sendTextMessage(phone, userService.getWelcomeMessage());
        return;
      }

      // If user exists, check their subscription status
      if (userData.subscription_status === 'active') {
        // User has an active subscription, delegate to command service
        await commandService.processCommand(phone, message, userData);
      } else if (userData.subscription_status === 'pending') {
        // User needs to complete payment
        await this.sendTextMessage(phone, userService.getPaymentReminderMessage());
      } else {
        // Default case: Ask for payment
        await this.sendTextMessage(phone, userService.getWelcomeMessage());
      }
    } catch (error: any) {
      logger.error('Error processing text message:', error);
      throw new AppError(`Failed to process text message: ${error.message}`, 500);
    }
  }

  /**
   * Process a payment receipt from a user
   * @param phone User's phone number
   * @param mediaUrl URL of the receipt image/document
   */
  private async processPaymentReceipt(phone: string, mediaUrl: string) {
    try {
      // Check if user is on cooldown
      const isOnCooldown = await receiptService.isUserOnCooldown(phone);
      
      if (isOnCooldown) {
        const cooldownMinutes = Math.floor(config.redis.cooldownTime / 60);
        await this.sendTextMessage(
          phone, 
          userService.getCooldownMessage(cooldownMinutes)
        );
        return;
      }

      // Get user data from Redis and MongoDB
      let userData = await userService.checkUserInRedis(phone);
      
      if (!userData) {
        userData = await userService.createUserInRedis(phone);
      }
      
      // Check if the user has already paid for the subscription  
      if(userData.subscription_status === 'active'){
        await this.sendTextMessage(
          phone,
          userService.getMenuMessage()
        );
        return;
      }

      let mongoUser;
      try {
        mongoUser = await userService.findOrCreateUser(phone);
      } catch (error) {
        logger.error('Error retrieving MongoDB user:', error);
        await this.sendTextMessage(
          phone,
          "There was a problem processing your payment. Please try again later."
        );
        return;
      }

      if (!mongoUser || !mongoUser._id) {
        logger.error('MongoDB user is missing or has no ID');
        await this.sendTextMessage(
          phone,
          "There was a problem with your account. Please contact support."
        );
        return;
      }

      // Process the receipt with OCR
      const receiptData = await receiptService.processReceiptImage(mediaUrl);
      
      if (!receiptData || !receiptData.transactionRef || !receiptData.amount) {
        logger.error('Receipt data is incomplete:', receiptData);
        await this.sendTextMessage(
          phone,
          "We couldn't process your receipt. Please make sure it's clear and try again."
        );
        return;
      }

      // Verify the payment with OPay
      const isPaymentValid = await receiptService.verifyOpayPayment(
        receiptData.transactionRef as string,
        receiptData.amount as string
      );

      const userId = mongoUser._id.toString();

      if (isPaymentValid) {
        // Payment is valid, update user status
        await userService.updateUserInRedis(phone, {
          registered: true,
          subscription_status: 'active',
          failed_attempts: 0,
        });
        
        // Create payment record in MongoDB
        await receiptService.createPaymentRecord(
          userId,
          receiptData.transactionRef as string,
          receiptData.amount as string,
          true
        );
        
        // Send success message and menu
        await this.sendTextMessage(
          phone,
          "✅ Payment verified successfully! Your subscription is now active. Here's your menu:"
        );
        
        await this.sendTextMessage(phone, userService.getMenuMessage());
      } else {
        // Payment is invalid, increment failed attempts
        const failedAttempts = await userService.incrementFailedAttempts(phone);
        
        // Create failed payment record
        await receiptService.createPaymentRecord(
          userId,
          receiptData.transactionRef as string,
          receiptData.amount as string,
          false
        );
        
        if (failedAttempts >= 3) {
          // Too many failed attempts, set cooldown
          await receiptService.setUserCooldown(phone);
          
          const cooldownMinutes = Math.floor(config.redis.cooldownTime / 60);
          await this.sendTextMessage(
            phone,
            userService.getCooldownMessage(cooldownMinutes)
          );
        } else {
          // Send failure message
          await this.sendTextMessage(
            phone,
            `❌ We couldn't verify your payment. Please ensure you uploaded the correct receipt (Attempt ${failedAttempts}/3).`
          );
        }
      }
    } catch (error: any) {
      logger.error('Error processing payment receipt:', error);
      throw new AppError(`Failed to process payment receipt: ${error.message}`, 500);
    }
  }

  /**
   * Format a phone number to ensure it's in E.164 format
   * @param phoneNumber Phone number to format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // If the number doesn't start with a '+', add the country code
    if (!phoneNumber.startsWith('+')) {
      return `+${digitsOnly}`;
    }
    
    return digitsOnly;
  }
}

export default new TwilioService(); 