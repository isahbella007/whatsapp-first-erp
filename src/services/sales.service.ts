import mongoose from "mongoose";
import * as stringSimilarity from 'string-similarity';
import { CommandContext } from "../interfaces/command.interface";
import { ICustomer } from "../interfaces/customer.interface";
import { IInventoryV2 } from "../interfaces/inventory.interface";
import Customer from "../models/Customer";
import Sale from "../models/Sale";
import AppError from "../utils/errors/AppError";
import logger from "../utils/logger";
import { RecordSaleParams } from "./commands/sales/record-sale.command";
import { ERROR_TYPES } from "../interfaces/error.interface";
import { getBestProductMatch } from "../utils/productMatching";

// Helper function for fuzzy matching customers, similar to getBestProductMatch
async function getBestCustomerMatch(userId: string, customerName: string): Promise<{ customer: ICustomer; confidence: number } | null> {
    const customers = await Customer.find({ user: userId });
    if (customers.length === 0) {
        return null;
    }

    const customerNames = customers.map(c => c.name);
    const bestMatch = stringSimilarity.findBestMatch(customerName.toLowerCase(), customerNames.map(name => name.toLowerCase()));

    logger.warn('Best customer match', JSON.stringify(bestMatch, null, 2) );
    // Using a 70% confidence threshold to consider it a match
    if (bestMatch.bestMatch.rating > 0.7) { 
        const matchedCustomer = customers[bestMatch.bestMatchIndex];
        return { customer: matchedCustomer, confidence: bestMatch.bestMatch.rating };
    }

    return null;
}

class SalesService {
    async recordSale(context: CommandContext, saleData: RecordSaleParams): Promise<any> {
        const { user } = context;
        const userId = user._id as string;
        const { customerNames, items, totalValue, amountPaid, notes } = saleData;

        let clarificationRequests = [];
        let processedCustomers: ICustomer[] = [];
        let processedItems = [];
        let calculatedTotalAmount = 0;
        const productsToUpdate: IInventoryV2[] = [];

        // 1. --- Customer Lookup ---
        if (customerNames && customerNames.length > 0) {
            for (const name of customerNames) {
                const customerMatch = await getBestCustomerMatch(userId, name);
                if (customerMatch) {
                    processedCustomers.push(customerMatch.customer);
                } else {
                    const prompt = `I couldn't find a customer named '${name}'. Please add them first or check the name for typos.`;
                    clarificationRequests.push({ type: ERROR_TYPES.CUSTOMER_NOT_FOUND, customerName: name, prompt });
                }
            }
        }
        
        // 2. --- Item Processing Loop ---
        for (const item of items) {
            if (!item.productName || !item.quantity) {
                logger.warn('Skipping an item in sale due to missing name or quantity.', { item });
                continue;
            }

            logger.info('------Getting best product match------');
            const productMatch = await getBestProductMatch(userId, item.productName);
            logger.info('------Product found------', JSON.stringify(productMatch, null, 2));
            
            
            if (!productMatch) {
                const prompt = `I can't record this sale because the product '${item.productName}' wasn't found in your inventory.`;
                clarificationRequests.push({ type: ERROR_TYPES.PRODUCT_FOR_SALE_NOT_FOUND, productName: item.productName, prompt });
                continue;
            }
            
            const product = productMatch.product;
            

            if (product.currentStockInBaseUnits < item.quantity) {
                const prompt = `You can't sell ${item.quantity} ${product.baseUnitOfMeasure}(s) of ${product.name} because you only have ${product.currentStockInBaseUnits} in stock.`;
                clarificationRequests.push({ type: ERROR_TYPES.INSUFFICIENT_STOCK, productName: product.name, prompt });
                continue;
            }

            let pricePerUnit = item.pricePerUnit ?? product.standardSellingPricePerBaseUnit;
            if (pricePerUnit === null || pricePerUnit === undefined) {
                const prompt = `The price for '${product.name}' was not specified and no default price is set.`;
                clarificationRequests.push({ type: ERROR_TYPES.SELLING_PRICE_NOT_FOUND, productName: product.name, prompt });
                continue;
            }

            const itemTotal = pricePerUnit * item.quantity;
            calculatedTotalAmount += itemTotal;
            
            product.currentStockInBaseUnits -= item.quantity;
            productsToUpdate.push(product);

            processedItems.push({
                product: product._id,
                quantity: item.quantity,
                pricePerUnit: pricePerUnit,
                total: itemTotal,
            });
        }

        if (clarificationRequests.length > 0) {
            return {
                success: false,
                needsClarification: true,
                clarificationRequests,
                message: clarificationRequests.map(r => r.prompt).join('\n')
            };
        }

        // 3. --- Finalize and Save (Transaction) ---
        const finalTotalAmount = totalValue ?? calculatedTotalAmount;
        const finalAmountPaid = amountPaid ?? finalTotalAmount; // Assume full payment if not specified

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const newSale = new Sale({
                user: userId,
                customers: processedCustomers.map(c => c._id),
                items: processedItems,
                totalAmount: finalTotalAmount,
                amountPaid: finalAmountPaid,
                status: finalAmountPaid >= finalTotalAmount ? 'complete' : 'incomplete',
                notes: notes,
            });

            await newSale.save({ session });

            for (const product of productsToUpdate) {
                await product.save({ session });
            }

            await session.commitTransaction();
            
            return {
                success: true,
                message: `✅ Sale recorded successfully. Your stock has been updated.`,
                sale: newSale
            };
        } catch (error) {
            await session.abortTransaction();
            logger.error('Transaction aborted! Failed to record sale.', { error });
            throw new AppError('A database error occurred during the sale transaction.', 500);
        } finally {
            session.endSession();
        }
    }
}

export default new SalesService();
