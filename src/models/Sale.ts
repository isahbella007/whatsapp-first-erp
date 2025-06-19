import mongoose, { Schema } from 'mongoose';
import { ISale } from '../interfaces/sale.interface';

const SaleSchema = new Schema<ISale>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User (business) is required'],
    },
    customers: [{
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    }],
    items: [{
      product: {
        type: Schema.Types.ObjectId,
        ref: 'NewInventory',
        required: [true, 'Product is required'],
      },
      quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1'],
      },
      pricePerUnit: {
        type: Number,
        required: [true, 'Price per unit is required'],
        min: [0, 'Price cannot be negative'],
      },
      total: {
        type: Number,
        required: [true, 'Total item price is required'],
        min: [0, 'Total cannot be negative'],
      }
    }],
    totalAmount: {
      type: Number,
      required: [true, 'Total amount for the sale is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
      default: 0
    },
    status: {
      type: String,
      enum: ['complete', 'incomplete'],
      required: true
    },
    notes: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    }
  },
  {
    timestamps: true,
  }
);

// Create indexes for faster queries
SaleSchema.index({ user: 1, createdAt: -1 });
SaleSchema.index({ customers: 1 });
SaleSchema.index({ status: 1 });

const Sale = mongoose.model<ISale>('Sale', SaleSchema);

export default Sale; 