import { Document, Types } from 'mongoose';

/**
 * Payment status enum
 */
export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Payment provider enum
 */
export enum PaymentProvider {
  OPAY = 'opay',
  PAYSTACK = 'paystack',
  FLUTTERWAVE = 'flutterwave',
  STRIPE = 'stripe',
  MANUAL = 'manual',
}

/**
 * Payment interface
 */
export interface IPayment extends Document {
  user: Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerTransactionId: string;
  subscriptionDuration: number; // In days
  reference: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment create data interface
 */
export interface IPaymentCreate {
  user: Types.ObjectId | string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  reference: string;
  subscriptionDuration: number;
  metadata?: Record<string, any>;
}

/**
 * OPay payment params interface
 */
export interface OPayParams {
  publicKey: string;
  merchantId: string;
  merchantName: string;
  reference: string;
  countryCode: string;
  currency: string;
  payAmount: number;
  productName: string;
  productDescription: string;
  callbackUrl: string;
  userClientIP: string;
  expireAt: number;
  paymentType?: string;
  userInfo?: {
    userId: string;
    userEmail: string;
    userMobile: string;
    userName: string;
  };
}

/**
 * Receipt data interface
 */
export interface IReceiptData {
  transactionRef: string;
  amount: string;
  accountNumber?: string;
  date?: string;
  bankName?: string;
  success?: boolean;
} 