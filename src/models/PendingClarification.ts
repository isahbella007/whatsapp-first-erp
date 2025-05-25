// models/PendingClarification.ts
import { Schema, model, Document } from 'mongoose';

// Define the interface for a clarification request
export interface IClarificationRequestData {
    unitName?: string; // e.g., 'crate' for UNIT_CONVERSION_REQUIRED
    targetUnit?: string; // e.g., 'bottle' for UNIT_CONVERSION_REQUIRED
    valueType?: 'price' | 'quantity'; // What kind of value is needed
    originalQuantity?: number; // Original quantity from user input
    originalUnit?: string; // Original unit from user input
    originalPrice?: number; // Original price from user input
    originalPriceUnit?: string; // Original price unit from user input
    originalPriceIsForTotalQuantity?: boolean; // Flag if price is for total quantity
    // Add other context needed to resolve the request later
}

export interface IPendingClarification extends Document {
  userId: string; // The user who made the request
  businessId: string; // The business context
  productId?: Schema.Types.ObjectId; // Link to Inventory item if known
  productName?: string; // If product wasn't created yet or needs fuzzy match
  type: 'UNIT_CONVERSION_REQUIRED' | 'SELLING_PRICE_REQUIRED' | 'PURCHASE_PRICE_REQUIRED' | 'BASE_UNIT_DEFINITION_REQUIRED';
  status: 'pending' | 'resolved' | 'cancelled';
  dataNeeded: {
    unitName?: string; // For conversion (e.g., 'crate')
    targetUnit?: string; // For conversion (e.g., 'bottle')
    valueType?: 'price' | 'quantity'; // What kind of value is needed
    // Add other relevant context data here, e.g., the original quantity, purchase ID
  };
  createdAt: Date;
  updatedAt: Date;
}

const PendingClarificationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  businessId: { type: Schema.Types.ObjectId, required: true, index: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Inventory', default: null }, // Null if product not created yet
  productName: { type: String, default: null }, // For fuzzy matching if productId is null
  type: { type: String, enum: ['UNIT_CONVERSION_REQUIRED', 'SELLING_PRICE_REQUIRED', 'PURCHASE_PRICE_REQUIRED', 'BASE_UNIT_DEFINITION_REQUIRED'], required: true },
  status: { type: String, enum: ['pending', 'resolved', 'cancelled'], default: 'pending' },
  dataNeeded: { type: Schema.Types.Mixed, default: {} }, // Store context relevant to the request
}, { timestamps: true });

export const PendingClarification = model<IPendingClarification>('PendingClarification', PendingClarificationSchema);