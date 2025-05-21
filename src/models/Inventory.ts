import mongoose, { Schema } from 'mongoose';
import { IInventory, ProductCondition } from '../interfaces/inventory.interface';

const InventorySchema = new Schema<IInventory>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Name cannot be more than 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      unique: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [false, 'Quantity is not required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    condition: {
      type: String,
      enum: Object.values(ProductCondition),
      default: ProductCondition.NEW,
    },
    images: {
      type: [String],
      default: [],
    },
    attributes: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for faster queries
InventorySchema.index({ user: 1 });
InventorySchema.index({ sku: 1 }, { unique: true });
InventorySchema.index({ name: 'text', description: 'text', category: 'text' });

const Inventory = mongoose.model<IInventory>('Inventory', InventorySchema);

export default Inventory; 