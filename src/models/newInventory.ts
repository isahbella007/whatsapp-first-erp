import { Schema, model } from 'mongoose';
import { IInventoryV2 } from '../interfaces/inventory.interface';

const InventorySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: null,
    trim: true
  },
  category: {
    type: String,
    default: 'Uncategorized',
    trim: true
  },

  // Core UoM and Stock Tracking
  baseUnitOfMeasure: {
    type: String,
    required: false,
    enum: ['bottle', 'piece', 'kg', 'gram', 'liter', 'ml', 'box', 'crate', 'dozen', 'pack', 'bag', 'unit', 'meter', 'cm'],
    default: null
  },

  // selling price per smallest unit of measurement
  standardSellingPricePerBaseUnit: {
    type: Number,
    required: false,
    min: [0, 'Price cannot be negative'],
    default: null
  },

  // current stock in smallest unit 
  currentStockInBaseUnits: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },

  // Conversion Factors for Alternative Units
  alternativeUnits: [{
    unitName: {
      type: String,
      required: true,
      trim: true
    },
    conversionFactorToBase: {
      type: Number,
      required: true,
      min: 0.001
    }
  }],

  // Other fields
  costPricePerBaseUnit: {
    type: Number,
    default: null,
    min: 0
  },
  reorderLevel: {
    type: Number,
    default: 0,
    min: 0
  },
  supplierInfo: [{
    name: String,
    contact: String,
    lastPurchasePricePerUnit: Number,
    lastPurchaseUnit: String
  }]
}, {
  timestamps: true
});

export const NewInventory = model<IInventoryV2>('new_inventory', InventorySchema);
