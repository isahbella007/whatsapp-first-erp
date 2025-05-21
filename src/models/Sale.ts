import mongoose, { Schema } from 'mongoose';
import { ISale } from '../interfaces/sale.interface';

const SaleSchema = new Schema<ISale>(
  {
    business: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Business is required'],
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    items: [{
      product: {
        type: Schema.Types.ObjectId,
        ref: 'Inventory',
        required: [true, 'Product is required'],
      },
      quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1'],
      },
      price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
      },
      total: {
        type: Number,
        required: [true, 'Total is required'],
        min: [0, 'Total cannot be negative'],
      }
    }],
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
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
SaleSchema.index({ customer: 1 });
SaleSchema.index({ status: 1 });

const Sale = mongoose.model<ISale>('Sale', SaleSchema);

export default Sale; 