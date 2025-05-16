import { nanoid } from 'nanoid';
import User from '../models/User';
import logger from '../utils/logger';
import AppError from '../utils/errors/AppError';
import redisClient from '../config/redis';
import { REDIS_KEYS, IRedisUserData } from '../interfaces/redis.interface';
import { IUser, SubscriptionStatus } from '../interfaces/user.interface';

/**
 * Service for user management
 */
class UserService {
  /**
   * Check if a user exists in Redis
   * @param phone User's phone number
   */
  async checkUserInRedis(phone: string): Promise<IRedisUserData | null> {
    try {
      const userKey = `${REDIS_KEYS.USER_PREFIX}${phone}`;
      const userData = await redisClient.get(userKey);
      
      return userData;
    } catch (error: any) {
      logger.error('Error checking user in Redis:', error);
      throw new AppError(`Failed to check user in Redis: ${error.message}`, 500);
    }
  }

  /**
   * Create a new user record in Redis
   * @param phone User's phone number
   */
  async createUserInRedis(phone: string): Promise<IRedisUserData> {
    try {
      const userKey = `${REDIS_KEYS.USER_PREFIX}${phone}`;
      
      const userData: IRedisUserData = {
        phone,
        registered: false,
        subscription_status: 'pending',
        failed_attempts: 0,
        last_interaction: Date.now(),
      };
      
      await redisClient.set(userKey, userData);
      logger.info(`Created new user in Redis for phone: ${phone}`);
      
      return userData;
    } catch (error: any) {
      logger.error('Error creating user in Redis:', error);
      throw new AppError(`Failed to create user in Redis: ${error.message}`, 500);
    }
  }

  /**
   * Update user data in Redis
   * @param phone User's phone number
   * @param data Data to update
   */
  async updateUserInRedis(phone: string, data: Partial<IRedisUserData>): Promise<IRedisUserData> {
    try {
      const userKey = `${REDIS_KEYS.USER_PREFIX}${phone}`;
      
      // Get current data
      const currentData = await this.checkUserInRedis(phone);
      
      if (!currentData) {
        throw new AppError('User not found in Redis', 404);
      }
      
      // Update data
      const updatedData: IRedisUserData = {
        ...currentData,
        ...data,
        last_interaction: Date.now(),
      };
      
      await redisClient.set(userKey, updatedData);
      logger.info(`Updated user in Redis for phone: ${phone}`);
      
      return updatedData;
    } catch (error: any) {
      logger.error('Error updating user in Redis:', error);
      throw new AppError(`Failed to update user in Redis: ${error.message}`, 500);
    }
  }

  /**
   * Increment failed attempts for a user in Redis
   * @param phone User's phone number
   */
  async incrementFailedAttempts(phone: string): Promise<number> {
    try {
      const userData = await this.checkUserInRedis(phone);
      
      if (!userData) {
        throw new AppError('User not found in Redis', 404);
      }
      
      const failedAttempts = userData.failed_attempts + 1;
      
      await this.updateUserInRedis(phone, {
        failed_attempts: failedAttempts,
      });
      
      return failedAttempts;
    } catch (error: any) {
      logger.error('Error incrementing failed attempts:', error);
      throw new AppError(`Failed to increment failed attempts: ${error.message}`, 500);
    }
  }

  /**
   * Check if a user exists in MongoDB and create if not
   * @param phone User's phone number
   */
  async findOrCreateUser(phone: string): Promise<IUser> {
    try {
      // Check if user exists
      let user = await User.findOne({ phone });
      
      // If user doesn't exist, create a new one
      if (!user) {
        // Generate random values for required fields
        const randomId = nanoid(8);
        
        user = await User.create({
          name: `User-${randomId}`,
          email: `user-${randomId}@example.com`,
          phone,
          password: nanoid(12), // Random password
          subscriptionStatus: SubscriptionStatus.PENDING,
        });
        
        logger.info(`Created new user in MongoDB for phone: ${phone}`);
      }
      
      return user;
    } catch (error: any) {
      logger.error('Error finding or creating user:', error);
      throw new AppError(`Failed to find or create user: ${error.message}`, 500);
    }
  }

  /**
   * Get welcome message for new users
   */
  getWelcomeMessage(): string {
    const welcomeMessages = [
      "👋 Welcome to our WhatsApp ERP system! To get started, please make a payment of ₦1500 to account 12345678901 (OPay) and upload your payment receipt.",
      "Hello there! 👋 To activate your WhatsApp ERP subscription, please transfer ₦1500 to OPay account 12345678901 and send us the payment receipt.",
      "Welcome! To begin using our WhatsApp ERP services, kindly make a payment of ₦1500 to OPay (12345678901) and share your payment receipt with us.",
      "Hi! 😊 Thanks for contacting our WhatsApp ERP service. To activate your account, please pay ₦1500 to OPay account 12345678901 and upload the receipt.",
    ];
    
    // Randomly select a welcome message
    const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
    return welcomeMessages[randomIndex];
  }

  /**
   * Get payment reminder message
   */
  getPaymentReminderMessage(): string {
    return "We're still waiting for your payment. Please make a payment of ₦1500 to OPay account 12345678901 and upload the receipt to activate your subscription.";
  }

  /**
   * Get cooldown message
   * @param minutes Minutes of cooldown
   */
  getCooldownMessage(minutes: number): string {
    return `You've made too many incorrect payment attempts. Please wait ${minutes} minutes before trying again.`;
  }

 
  getMenuMessage(): string {
    return `
👋 Hi [Business Name]! You have 28 credits left.

Here's what you can do (reply with the number or command):

1️⃣ Add products  
  ➤ Example: 'add zobo 10 1k, chinchin 5 500'

2️⃣ Update stock  
  ➤ Example: 'update coke 12, fanta 8'
  ➤ Change price: 'update zobo price 1500'
  ➤ Both: 'update zobo 10 1200'

3️⃣ View all stock  
  ➤ Just send: 'stock'

4️⃣ Delete products  
  ➤ Example: 'delete zobo'

5️⃣ Record sale  
  ➤ Example: 'order zobo 2, chinchin 1'

5️⃣ Sales report  
  ➤ Example: 'report daily'
  
6️⃣ Customers  
  ➤ 'customer add [customer name] [optional: phone [phone number]] [optional: tags [tag1,tag2,...]]'  
  ➤ 'customer find [customer name/contact]'  

💡 Tip: You can enter multiple items in one message to save credits.
          `
}
}

export default new UserService(); 