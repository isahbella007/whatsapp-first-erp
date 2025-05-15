import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import logger from '../utils/logger';
import AppError from '../utils/errors/AppError';
import { 
  IPaymentCreate, 
  PaymentStatus, 
  PaymentProvider,
  OPayParams 
} from '../interfaces/payment.interface';
import Payment from '../models/Payment';
import User from '../models/User';
import { SubscriptionStatus } from '../interfaces/user.interface';

/**
 * Payment Service for handling payments through OPay
 */
class PaymentService {
  private publicKey: string;
  private merchantId: string;
  private merchantName: string;
  private environment: string;
  private apiBaseUrl: string;

  constructor() {
    this.publicKey = config.opay.publicKey;
    this.merchantId = config.opay.merchantId;
    this.merchantName = config.opay.merchantName;
    this.environment = config.opay.environment;
    
    // Set API base URL based on environment
    this.apiBaseUrl = this.environment === 'production'
      ? 'https://api.opaycheckout.com'
      : 'https://api-sandbox.opaycheckout.com';
  }

  /**
   * Create a payment record in the database
   * @param paymentData Payment data
   */
  async createPaymentRecord(paymentData: IPaymentCreate) {
    try {
      // Create payment record
      const payment = await Payment.create({
        ...paymentData,
        status: PaymentStatus.PENDING,
      });

      logger.info(`Payment record created with reference: ${payment.reference}`);
      return payment;
    } catch (error: any) {
      logger.error('Error creating payment record:', error);
      throw new AppError('Failed to create payment record', 500);
    }
  }

  /**
   * Initialize payment with OPay
   * @param userId User ID
   * @param amount Payment amount
   * @param duration Subscription duration in days
   */
  async initializePayment(userId: string, amount: number, duration: number = 30) {
    try {
      // Find user
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Generate unique reference
      const reference = `PAY-${uuidv4()}`;
      
      // Create payment record
      const payment = await this.createPaymentRecord({
        user: userId,
        amount,
        currency: 'NGN',
        provider: PaymentProvider.OPAY,
        reference,
        subscriptionDuration: duration,
      });

      // Generate OPay payment parameters
      const payParams: OPayParams = {
        publicKey: this.publicKey,
        merchantId: this.merchantId,
        merchantName: this.merchantName,
        reference: payment.reference,
        countryCode: 'NG',
        currency: 'NGN',
        payAmount: amount,
        productName: 'WhatsApp ERP Subscription',
        productDescription: `${duration} days subscription to WhatsApp ERP`,
        callbackUrl: `${config.server.env === 'development' ? 'http://localhost:' + config.server.port : ''}/api/payments/webhook`,
        userClientIP: '127.0.0.1', // This should be dynamically set in a real application
        expireAt: 30, // Expire in 30 minutes
        userInfo: {
          userId: user._id as string,
          userEmail: user.email,
          userMobile: user.phone,
          userName: user.name,
        },
      };

      logger.info(`OPay payment initialized with reference: ${payment.reference}`);
      
      return {
        paymentId: payment._id,
        reference: payment.reference,
        payParams,
      };
    } catch (error: any) {
      logger.error('Error initializing payment:', error);
      throw new AppError(error.message, error.statusCode || 500);
    }
  }

  /**
   * Verify payment status with OPay
   * @param reference Payment reference
   */
  async verifyPayment(reference: string) {
    try {
      const payment = await Payment.findOne({ reference });
      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      // Only verify pending payments
      if (payment.status !== PaymentStatus.PENDING) {
        return payment;
      }

      // Call OPay API to verify payment status
      const api = axios.create({
        baseURL: this.apiBaseUrl,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.publicKey}`,
        },
      });

      const response = await api.get(`/api/v1/payments/status?reference=${reference}`);
      
      // Check payment status from OPay
      if (response.data.data && response.data.data.status === 'SUCCESS') {
        // Update payment status to completed
        payment.status = PaymentStatus.COMPLETED;
        payment.providerTransactionId = response.data.data.transactionId || '';
        await payment.save();
        
        // Update user subscription
        await this.activateUserSubscription(payment.user.toString(), payment.subscriptionDuration);
        
        logger.info(`Payment ${reference} verified and completed`);
      } else if (response.data.data && response.data.data.status === 'FAILED') {
        // Update payment status to failed
        payment.status = PaymentStatus.FAILED;
        await payment.save();
        
        logger.info(`Payment ${reference} verification failed`);
      }

      return payment;
    } catch (error: any) {
      logger.error(`Error verifying payment ${reference}:`, error);
      throw new AppError('Failed to verify payment', 500);
    }
  }

  /**
   * Process OPay webhook notification
   * @param payload Webhook payload
   */
  async processWebhook(payload: any) {
    try {
      logger.info('Processing OPay webhook notification');
      
      // Verify webhook signature - in a real app, this should be implemented
      // based on OPay's webhook signature verification mechanism
      
      const reference = payload.reference;
      if (!reference) {
        throw new AppError('Invalid webhook payload: missing reference', 400);
      }
      
      // Find the payment
      const payment = await Payment.findOne({ reference });
      if (!payment) {
        throw new AppError(`Payment with reference ${reference} not found`, 404);
      }
      
      // Update payment status based on webhook data
      if (payload.status === 'SUCCESS') {
        payment.status = PaymentStatus.COMPLETED;
        payment.providerTransactionId = payload.transactionId || '';
        await payment.save();
        
        // Activate user subscription
        await this.activateUserSubscription(payment.user.toString(), payment.subscriptionDuration);
        
        logger.info(`Payment ${reference} completed via webhook`);
      } else if (payload.status === 'FAILED') {
        payment.status = PaymentStatus.FAILED;
        await payment.save();
        
        logger.info(`Payment ${reference} failed via webhook`);
      }
      
      return { processed: true };
    } catch (error: any) {
      logger.error('Error processing webhook:', error);
      throw new AppError(error.message, error.statusCode || 500);
    }
  }

  /**
   * Activate user subscription after successful payment
   * @param userId User ID
   * @param duration Subscription duration in days
   */
  private async activateUserSubscription(userId: string, duration: number) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + duration);
      
      // If already subscribed, extend subscription
      if (user.subscriptionStatus === SubscriptionStatus.ACTIVE && 
          user.subscriptionExpiresAt > new Date()) {
        // Add duration to current expiration date
        user.subscriptionExpiresAt.setDate(user.subscriptionExpiresAt.getDate() + duration);
      } else {
        // Set new expiration date
        user.subscriptionStatus = SubscriptionStatus.ACTIVE;
        user.subscriptionExpiresAt = expiresAt;
      }
      
      await user.save();
      logger.info(`User ${userId} subscription activated until ${user.subscriptionExpiresAt}`);
      
      return user;
    } catch (error: any) {
      logger.error(`Error activating subscription for user ${userId}:`, error);
      throw new AppError('Failed to activate subscription', 500);
    }
  }

  /**
   * Get payment details
   * @param paymentId Payment ID
   */
  async getPaymentDetails(paymentId: string) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new AppError('Payment not found', 404);
      }
      
      return payment;
    } catch (error: any) {
      logger.error(`Error getting payment details for ${paymentId}:`, error);
      throw new AppError('Failed to get payment details', 500);
    }
  }

  /**
   * Get user payments
   * @param userId User ID
   */
  async getUserPayments(userId: string) {
    try {
      const payments = await Payment.find({ user: userId }).sort({ createdAt: -1 });
      return payments;
    } catch (error: any) {
      logger.error(`Error getting payments for user ${userId}:`, error);
      throw new AppError('Failed to get user payments', 500);
    }
  }
}

export default new PaymentService(); 