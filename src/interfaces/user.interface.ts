import { Document } from 'mongoose';

/**
 * User role enum
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

/**
 * User subscription status enum
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  EXPIRED = 'expired',
}

/**
 * User interface
 */
export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: Date;
  lastLogin: Date;
  paymentVerified: boolean;
  failedPaymentAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * User creation data interface
 */
export interface IUserCreate {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
} 