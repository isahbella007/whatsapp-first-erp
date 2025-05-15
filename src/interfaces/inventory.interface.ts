import { Document, Types } from 'mongoose';

/**
 * Product condition enum
 */
export enum ProductCondition {
  NEW = 'new',
  USED = 'used',
  REFURBISHED = 'refurbished',
}

/**
 * Inventory item interface
 */
export interface IInventory extends Document {
  user: Types.ObjectId;
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  category: string;
  quantity: number;
  price: number;
  costPrice: number;
  condition: ProductCondition;
  images: string[];
  attributes: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inventory creation interface
 */
export interface IInventoryCreate {
  user: Types.ObjectId | string;
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  category: string;
  quantity: number;
  price: number;
  costPrice: number;
  condition: ProductCondition;
  images?: string[];
  attributes?: Record<string, any>;
}

/**
 * Inventory update interface
 */
export interface IInventoryUpdate {
  name?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category?: string;
  quantity?: number;
  price?: number;
  costPrice?: number;
  condition?: ProductCondition;
  images?: string[];
  attributes?: Record<string, any>;
} 