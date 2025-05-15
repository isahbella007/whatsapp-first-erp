import mongoose, { Schema } from 'mongoose';
import { IPayment, PaymentStatus, PaymentProvider } from '../interfaces/payment.interface';

const PaymentSchema = new Schema<IPayment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      trim: true,
      uppercase: true,
      default: 'NGN',
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    provider: {
      type: String,
      enum: Object.values(PaymentProvider),
      required: [true, 'Payment provider is required'],
    },
    providerTransactionId: {
      type: String,
      trim: true,
    },
    subscriptionDuration: {
      type: Number,
      required: [true, 'Subscription duration is required'],
      min: [1, 'Subscription duration must be at least 1 day'],
      default: 30, // 30 days by default
    },
    reference: {
      type: String,
      required: [true, 'Payment reference is required'],
      trim: true,
      unique: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for faster queries
PaymentSchema.index({ user: 1, createdAt: -1 });
PaymentSchema.index({ reference: 1 }, { unique: true });
PaymentSchema.index({ provider: 1, providerTransactionId: 1 });

const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment; 