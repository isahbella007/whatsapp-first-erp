import { ISale } from "../interfaces/sale.interface";
import AppError from "../utils/errors/AppError";
import logger from "../utils/logger";
import { getBestProductMatch } from "../utils/productMatching";
import { RecordSaleParams } from "./commands/sales/record-sale.command";
import Sale from "../models/Sale";
import inventoryService from "./inventory.service";

interface IncompleteAction {
    productName: string;
    reason: string;
}

class SalesService {
    async recordSale(saleData: RecordSaleParams, userId: string): Promise<{ 
        success: boolean; 
        message: string;
        sale?: ISale;
        incompleteActions?: IncompleteAction[];
    }> {
        try {
            const incompleteActions: IncompleteAction[] = [];
            const validItems = [];

            // First pass: Validate products exist and collect valid items
            for (const item of saleData.items) {
                // Validate quantity
                if (!item.quantity || item.quantity <= 0) {
                    incompleteActions.push({
                        productName: item.productName,
                        reason: `Invalid quantity: ${item.quantity}`
                    });
                    continue;
                }

                // Fuzzy match product
                const fuzzySearchResult = await getBestProductMatch(userId, item.productName);
                // logger.info(`Fuzzy search result: ${JSON.stringify(fuzzySearchResult)}`);
                if (!fuzzySearchResult) {
                    incompleteActions.push({
                        productName: item.productName,
                        reason: "Product not found in inventory"
                    });
                    continue;
                }

                // Get inventory price
                const inventoryPrice = fuzzySearchResult.product.price;

                // Handle price scenarios
                let pricePerUnit = item.pricePerUnit;
                let priceSource = 'provided';

                if (pricePerUnit === null) {
                    if (saleData.totalValue === null) {
                        // If no totalValue provided, we need prices for all items
                        incompleteActions.push({
                            productName: item.productName,
                            reason: "Price not provided and total value not specified"
                        });
                        continue;
                    } else {
                        // If totalValue provided, use inventory price
                        pricePerUnit = inventoryPrice;
                        priceSource = 'inventory';
                    }
                }

                // Validate price
                if (pricePerUnit <= 0) {
                    incompleteActions.push({
                        productName: item.productName,
                        reason: `Invalid price: ${pricePerUnit}`
                    });
                    continue;
                }

                validItems.push({
                    product: fuzzySearchResult.product._id,
                    quantity: item.quantity,
                    price: pricePerUnit,
                    total: item.quantity * pricePerUnit,
                    priceSource
                });
            }

            // If no valid items, return early
            if (validItems.length === 0) {
                return {
                    success: false,
                    message: "No valid items to record in the sale",
                    incompleteActions
                };
            }

            // Calculate total amount
            const totalAmount = saleData.totalValue ?? 
                validItems.reduce((sum, item) => sum + item.total, 0);

            // Create sale record if we have valid items
            const sale = await Sale.create({
                business: userId,
                items: validItems,
                totalAmount,
                notes: saleData.notes,
                metadata: {
                    customerName: saleData.customerName,
                    status: saleData.status,
                    amountPaid: saleData.amountPaid
                }
            });

            // Construct response message
            let message = `I've recorded the sale of ${validItems.length} item${validItems.length > 1 ? 's' : ''}.`;

            if (incompleteActions.length > 0) {
                message += " However, I couldn't process the following items:\n";
                incompleteActions.forEach(action => {
                    message += `- ${action.productName}: ${action.reason}\n`;
                });

                // Add helpful suggestion for price-related issues
                const priceIssues = incompleteActions.filter(a => 
                    a.reason.includes("Price not provided") || 
                    a.reason.includes("Invalid price")
                );
                
                if (priceIssues.length > 0) {
                    message += "\nPlease provide prices for these items. For example:\n";
                    message += priceIssues?.map(item => 
                        `"${item.productName} was [price] per unit"`
                    ).join(" and ");
                }
            }

            return {
                success: true,
                message,
                sale,
                incompleteActions: incompleteActions.length > 0 ? incompleteActions : undefined
            };

        } catch (error: any) {
            logger.error('Error recording sale:', error);
            throw new AppError(
                `Failed to record sale: ${error.message}`,
                error.statusCode ?? 500
            );
        }
    }
}

export default new SalesService();


