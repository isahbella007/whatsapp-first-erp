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

/**
 * Enhanced Inventory interface with UoM and stock tracking
 */
export interface IInventoryV2 extends Document {
  name: string;
  description?: string;
  category: string;
  baseUnitOfMeasure?: 'bottle' | 'piece' | 'kg' | 'gram' | 'liter' | 'ml' | 'box' | 'crate' | 'dozen' | 'pack' | 'bag' | 'unit' | 'meter' | 'cm';
  standardSellingPricePerBaseUnit?: number;
  currentStockInBaseUnits: number;
  alternativeUnits?: Array<{
    unitName: string;
    conversionFactorToBase: number;
  }>;
  costPricePerBaseUnit?: number;
  reorderLevel: number;
  supplierInfo?: Array<{
    name: string;
    contact: string;
    lastPurchasePricePerUnit?: number;
    lastPurchaseUnit?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Enhanced Inventory creation interface
 */
export interface IInventoryV2Create {
  name: string;
  description?: string;
  category?: string;
  baseUnitOfMeasure?: 'bottle' | 'piece' | 'kg' | 'gram' | 'liter' | 'ml' | 'box' | 'crate' | 'dozen' | 'pack' | 'bag' | 'unit' | 'meter' | 'cm';
  standardSellingPricePerBaseUnit?: number;
  currentStockInBaseUnits?: number;
  alternativeUnits?: Array<{
    unitName: string;
    conversionFactorToBase: number;
  }>;
  costPricePerBaseUnit?: number;
  reorderLevel?: number;
  supplierInfo?: Array<{
    name: string;
    contact: string;
    lastPurchasePricePerUnit?: number;
    lastPurchaseUnit?: string;
  }>;
}

/**
 * Enhanced Inventory update interface
 */
export interface IInventoryV2Update {
  name?: string;
  description?: string;
  category?: string;
  baseUnitOfMeasure?: 'bottle' | 'piece' | 'kg' | 'gram' | 'liter' | 'ml' | 'box' | 'crate' | 'dozen' | 'pack' | 'bag' | 'unit' | 'meter' | 'cm';
  standardSellingPricePerBaseUnit?: number;
  currentStockInBaseUnits?: number;
  alternativeUnits?: Array<{
    unitName: string;
    conversionFactorToBase: number;
  }>;
  costPricePerBaseUnit?: number;
  reorderLevel?: number;
  supplierInfo?: Array<{
    name: string;
    contact: string;
    lastPurchasePricePerUnit?: number;
    lastPurchaseUnit?: string;
  }>;
} 