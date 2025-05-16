import { Document, Types } from "mongoose";

export interface ICustomer extends Document {
    business: Types.ObjectId;
    name: string;
    phone: string;
    totalSpent?: number;
    lastPurchaseDate?: Date;
    tags?: string[];
    email?: string;
    address?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Customer create interface
 */
export interface ICustomerCreate {
    business: Types.ObjectId | string;
    name: string;
    phone: string;
    tags?: string[];
    email?: string;
    address?: string;
}

/**
 * Customer update interface
 */
export interface ICustomerUpdate {
    name?: string;
    phone?: string;
    tags?: string[]; 
    email?: string; 
    address?: string;
}
