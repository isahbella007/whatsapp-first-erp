import mongoose, { Schema, Types } from "mongoose";
import { ICustomer } from "../interfaces/customer.interface";

const CustomerSchema = new Schema<ICustomer>({ 
    business: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Business is required'],
    },
    name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
        unique: true,
        maxlength: [200, 'Name cannot be more than 200 characters'],
    },  
    phone: {    
        type: String,
        trim: true,
        unique: true,
        sparse: true,
        maxlength: [20, 'Phone cannot be more than 20 characters'],
    },
    totalSpent: {
        type: Number,
        default: 0,
    },
    lastPurchaseDate: {
        type: Date,
        default: null,
    },
    tags: {
        type: [String],
        default: [],
    },
    email: {
        type: String,
        trim: true,
        unique: true,
        sparse: true,
        maxlength: [200, 'Email cannot be more than 200 characters'],
    },
    address: {
        type: String,
        trim: true,
        maxlength: [200, 'Address cannot be more than 200 characters'],
    },
    
    
}, {
    timestamps: true,
});

const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);

export default Customer;