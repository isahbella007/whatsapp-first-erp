import { Document, Types } from 'mongoose';

/**
 * Sale status enum
 */
export enum SaleStatus {
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
}

/**
 * Payment method enum
 */
export enum PaymentMethod {
  CASH = 'cash',
  TRANSFER = 'transfer',
  CARD = 'card',
  OTHER = 'other',
}

/**
 * Sale item interface
 */
export interface ISaleItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
  total: number;
}

/**
 * Sale interface
 */
export interface ISale extends Document {
  user: Types.ObjectId;
  customers?: Types.ObjectId[];
  items: ISaleItem[];
  totalAmount: number;
  amountPaid: number;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sale creation interface
 */
export interface ISaleCreate {
  user: Types.ObjectId | string;
  customer?: Types.ObjectId | string;
  items: {
    product: Types.ObjectId | string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Sale update interface
 */
export interface ISaleUpdate {
  customer?: Types.ObjectId | string;
  items?: {
    product: Types.ObjectId | string;
    quantity: number;
    price: number;
  }[];
  totalAmount?: number;
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Extracted sale data from natural language
 */
export interface IExtractedSaleData {
  items: {
    productName: string;
    quantity: number;
    price?: number;
  }[];
  customerName?: string;
  totalAmount?: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
} 