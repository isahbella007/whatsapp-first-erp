import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';
import AppError from '../utils/errors/AppError';
import redisClient from '../config/redis';
import { REDIS_KEYS } from '../interfaces/redis.interface';
import User from '../models/User';
import Payment from '../models/Payment';
import { PaymentStatus, PaymentProvider, IReceiptData } from '../interfaces/payment.interface';
import { SubscriptionStatus } from '../interfaces/user.interface';

/**
 * Service for processing receipt images and verifying payments
 */
class ReceiptService {
  /**
   * Process a receipt image using OCR and extract payment details
   * @param imageUrl URL of the receipt image
   */
  async processReceiptImage(imageUrl: string): Promise<IReceiptData> {
    try {
      logger.info('Processing receipt image with OCR');
      
      // This would typically call an external OCR API
      // For this implementation, we'll mock the OCR process
      const extractedData = await this.mockOcrExtraction(imageUrl);
      
      return extractedData;
    } catch (error: any) {
      logger.error('Error processing receipt with OCR:', error);
      throw new AppError(`Failed to process receipt image: ${error.message}`, 500);
    }
  }

  /**
   * Mock OCR extraction for testing purposes
   * In a real implementation, this would call an actual OCR service
   * @param imageUrl URL of the receipt image
   */
  private async mockOcrExtraction(imageUrl: string): Promise<IReceiptData> {
    // This is a mock implementation
    // In a real system, you would call an OCR API here
    logger.info(`Mock OCR processing for image: ${imageUrl}`);
    
    // Generate mock payment data
    return {
      transactionRef: `TRX${Math.floor(Math.random() * 1000000)}`,
      amount: "1500.00",
      accountNumber: "12345678901",
      date: new Date().toISOString(),
      bankName: "OPay",
      success: Math.random() > 0.3, // 70% chance of success for testing
    };
  }

  /**
   * Verify a payment with OPay API
   * @param transactionRef Transaction reference to verify
   * @param amount Amount of the transaction
   */
  async verifyOpayPayment(transactionRef: string, amount: string): Promise<boolean> {
    try {
      logger.info(`Verifying OPay payment: ${transactionRef}`);
      
      // This would call the actual OPay verification API
      // For this implementation, we'll mock the API call
      const isVerified = await this.mockOpayVerification(transactionRef, amount);
      
      return isVerified;
    } catch (error: any) {
      logger.error('Error verifying OPay payment:', error);
      throw new AppError(`Failed to verify payment: ${error.message}`, 500);
    }
  }

  /**
   * Mock OPay verification for testing purposes
   * In a real implementation, this would call the actual OPay API
   * @param transactionRef Transaction reference to verify
   * @param amount Amount of the transaction
   */
  private async mockOpayVerification(transactionRef: string, amount: string): Promise<boolean> {
    // This is a mock implementation
    // In a real system, you would call the OPay API here
    logger.info(`Mock OPay verification for transaction: ${transactionRef}, amount: ${amount}`);
    
    // For testing purposes, verify if amount is correct and transaction starts with TRX
    const isValidAmount = amount === "1500.00";
    const isValidRef = transactionRef.startsWith('TRX');
    
    return isValidAmount && isValidRef;
  }

  /**
   * Check if a user is on cooldown for payment uploads
   * @param phone User's phone number
   */
  async isUserOnCooldown(phone: string): Promise<boolean> {
    try {
      const cooldownKey = `${REDIS_KEYS.COOLDOWN_PREFIX}${phone}`;
      const exists = await redisClient.exists(cooldownKey);
      
      return exists;
    } catch (error: any) {
      logger.error('Error checking user cooldown:', error);
      throw new AppError(`Failed to check user cooldown: ${error.message}`, 500);
    }
  }

  /**
   * Set a cooldown for a user
   * @param phone User's phone number
   */
  async setUserCooldown(phone: string): Promise<void> {
    try {
      const cooldownKey = `${REDIS_KEYS.COOLDOWN_PREFIX}${phone}`;
      await redisClient.set(cooldownKey, { phone, timestamp: Date.now() }, config.redis.cooldownTime);
      
      logger.info(`Set cooldown for phone: ${phone} for ${config.redis.cooldownTime} seconds`);
    } catch (error: any) {
      logger.error('Error setting user cooldown:', error);
      throw new AppError(`Failed to set user cooldown: ${error.message}`, 500);
    }
  }

  /**
   * Create a payment record in the database
   * @param userData User data
   * @param transactionRef Transaction reference
   * @param amount Payment amount
   * @param verified Whether the payment was verified
   */
  async createPaymentRecord(
    userId: string,
    transactionRef: string,
    amount: string,
    verified: boolean
  ): Promise<any> {
    try {
      const payment = await Payment.create({
        user: userId,
        amount: parseFloat(amount),
        currency: 'NGN',
        status: verified ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
        provider: PaymentProvider.OPAY,
        providerTransactionId: transactionRef,
        subscriptionDuration: 30, // 30 days subscription
        reference: `WA-${Date.now()}`,
        metadata: {
          verifiedViaWhatsApp: true,
          verificationTimestamp: Date.now(),
        },
      });

      logger.info(
        `Created payment record: ${payment._id} for user: ${userId}, status: ${payment.status}`
      );

      // If payment was verified, update user's subscription status
      if (verified) {
        await User.findByIdAndUpdate(userId, {
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          paymentVerified: true,
          failedPaymentAttempts: 0,
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        });
      }

      return payment;
    } catch (error: any) {
      logger.error('Error creating payment record:', error);
      throw new AppError(`Failed to create payment record: ${error.message}`, 500);
    }
  }
}

export default new ReceiptService(); 