import { CommandContext } from "../interfaces/command.interface";
import { IInventory, IInventoryV2 } from "../interfaces/inventory.interface";
import { NewInventory } from "../models/newInventory";
import logger from "../utils/logger";
import { getBestProductMatch } from "../utils/productMatching";
import { ProductParams } from "./commands/products/add-product.command";

const ALLOWED_UNITS = ['bottle', 'piece', 'kg', 'gram', 'liter', 'ml', 'box', 'crate', 'dozen', 'pack', 'bag', 'unit', 'meter', 'cm', 'one'] as const;
type AllowedUnit = typeof ALLOWED_UNITS[number];

function normalizeUnitName(unit: string): AllowedUnit | undefined {
    if (!unit) return undefined;
    const normalized = unit.toLowerCase().replace(/s$/, '');
    return ALLOWED_UNITS.includes(normalized as AllowedUnit) ? normalized as AllowedUnit : undefined;
}

class NewInventoryService { 

     // get all products for a user
    async getProducts(userId: string): Promise<IInventoryV2[]> {
        return await NewInventory.find({ user: userId });
    }

    async addProduct(context: CommandContext, productData: ProductParams): Promise<any> {
        const { user } = context;
        let clarificationRequests = []
        const { productName, price, priceUnitOfMeasure, initialQuantity, initialQuantityUnitOfMeasure, conversionFactorProvided } = productData;
        const userId = user._id as string;

        logger.info(`Executing AddProductCommand for ${productName}`);

        // Product Lookup
        const matchResult = await getBestProductMatch(userId, productName);
        logger.info(`The matchResult is ${matchResult}`)
        let product: IInventoryV2;

        if (!matchResult) {
            // --- NEW PRODUCT CREATION ---
            logger.info(`Product '${productName}' not found. Creating new product.`);
            product = new NewInventory({
                name: productName,
                currentStockInBaseUnits: 0,
                alternativeUnits: [],
                standardSellingPricePerBaseUnit: null,
                baseUnitOfMeasure: null, // Will determine below
                costPricePerBaseUnit: null,
                user: userId,
            });

            // Determine the Base Unit of Measure for NEW products ONLY
            if (conversionFactorProvided && conversionFactorProvided.unit2) {
                product.baseUnitOfMeasure = normalizeUnitName(conversionFactorProvided.unit2);
                logger.info(`Base unit inferred from conversion: ${product.baseUnitOfMeasure}`);
            } else if (priceUnitOfMeasure) {
                const normalizedPriceUnit = normalizeUnitName(priceUnitOfMeasure);
                if (normalizedPriceUnit && !['crate', 'carton', 'box', 'dozen'].includes(normalizedPriceUnit)) {
                    product.baseUnitOfMeasure = normalizedPriceUnit;
                    logger.info(`Base unit inferred from price unit: ${product.baseUnitOfMeasure}`);
                } else {
                    // If price unit is a bulk unit, we need clarification
                    const prompt = `I see you're using ${normalizedPriceUnit} as a unit. What's the smallest unit you use to track and sell ${productName}? (e.g., 'piece', 'bottle', 'kg', 'pack')`;
                    clarificationRequests.push({
                        type: 'BASE_UNIT_DEFINITION_REQUIRED',
                        productName: productName,
                        prompt: prompt,
                        dataNeeded: {
                            valueType: 'quantity'
                        }
                    });
                    logger.warn(`Queued BASE_UNIT_DEFINITION_REQUIRED for ${productName} due to bulk unit`);
                    return {
                        success: false,
                        needsClarification: true,
                        clarificationRequests,
                        message: prompt
                    };
                }
            } else if (initialQuantityUnitOfMeasure ) {
                const normalizedInitialUnit = normalizeUnitName(initialQuantityUnitOfMeasure)
                if(normalizedInitialUnit && !['crate', 'carton', 'box', 'dozen'].includes(normalizedInitialUnit)) {
                    product.baseUnitOfMeasure = normalizedInitialUnit;
                    logger.info(`Base unit inferred from initial quantity unit: ${product.baseUnitOfMeasure}`);
                } else {
                    // If initial quantity unit is a bulk unit, we need clarification
                    const prompt = `I see you do not have a defined unit. What's the smallest unit you use to track and sell ${productName}? (e.g., 'piece', 'bottle', 'kg', 'pack')`;
                    clarificationRequests.push({
                        type: 'BASE_UNIT_DEFINITION_REQUIRED',
                        productName: productName,
                        prompt: prompt,
                        dataNeeded: {
                            valueType: 'quantity'
                        }
                    });
                    logger.warn(`Queued BASE_UNIT_DEFINITION_REQUIRED for ${productName} due to bulk unit`);
                    return {
                        success: false,
                        needsClarification: true,
                        clarificationRequests,
                        message: prompt
                    };
                }
            } else {
                // Cannot determine base unit from input, queue clarification
                const prompt = `What's the smallest unit you use to track and sell ${productName}? (e.g., 'piece', 'bottle', 'kg', 'pack')`;
                clarificationRequests.push({
                    type: 'BASE_UNIT_DEFINITION_REQUIRED',
                    productName: productName,
                    prompt: prompt,
                    dataNeeded: {
                        valueType: 'quantity'
                    }
                });
                logger.warn(`Queued BASE_UNIT_DEFINITION_REQUIRED for ${productName}`);
                return {
                    success: false,
                    needsClarification: true,
                    clarificationRequests,
                    message: prompt
                };
            }
        } else {
            // --- EXISTING PRODUCT ---
            logger.warn(`Existing product '${productName}' found with confidence ${matchResult.confidence}. ID: ${matchResult.product._id}`);
            product = matchResult.product; // Assign the found product directly to 'product'
            // No need to redetermine baseUnitOfMeasure, it's already set (or pending clarification from a previous interaction).
        }

        // --- Proceed with general product updates/stock addition/price setting ---
        // This part runs for both new and existing products, using the 'product' variable

        // 1. Process Conversion Factor (if provided in the current command for any product)
        // This logic remains the same as in my previous full code example.
        // It should be here, outside the 'if (!matchResult)' block.
        if (conversionFactorProvided && product.baseUnitOfMeasure) {
            const unit1Name = normalizeUnitName(conversionFactorProvided.unit1);
            const unit2Name = normalizeUnitName(conversionFactorProvided.unit2);
            let factorToBase: number | null = null;

            // Only proceed if both units are valid
            if (unit1Name && unit2Name) {
                // MVP Logic: Assume unit2 is always the base unit in conversionFactorProvided
                if (unit2Name === product.baseUnitOfMeasure) {
                    factorToBase = (conversionFactorProvided.unit2Quantity as unknown as number) / (conversionFactorProvided.unit1Quantity as unknown as number);
                } else if (unit1Name === product.baseUnitOfMeasure) {
                    factorToBase = (conversionFactorProvided.unit1Quantity as unknown as number) / (conversionFactorProvided.unit2Quantity as unknown as number);
                } else {
                    logger.warn(`Neither unit in conversion '${unit1Name}'/'${unit2Name}' matches base unit '${product.baseUnitOfMeasure}' for ${productName}`);
                }

                if (factorToBase !== null) {
                    const altUnitToStore = unit1Name === product.baseUnitOfMeasure ? unit2Name : unit1Name;
                    if (!product.alternativeUnits) {
                        product.alternativeUnits = [];
                    }
                    const existingAltUnitIndex = product.alternativeUnits.findIndex(au => au.unitName === altUnitToStore);

                    if (existingAltUnitIndex > -1) {
                        product.alternativeUnits[existingAltUnitIndex].conversionFactorToBase = factorToBase;
                        product.alternativeUnits[existingAltUnitIndex].unitName = altUnitToStore;
                    } else {
                        product.alternativeUnits.push({
                            unitName: altUnitToStore,
                            conversionFactorToBase: factorToBase
                        });
                    }
                    logger.info(`Conversion factor added/updated for ${altUnitToStore} to ${product.baseUnitOfMeasure}: ${factorToBase}`);
                }
            } else {
                logger.warn(`Invalid unit names provided in conversion factor for ${productName}`);
            }
        }

        
        // 2. Process Initial Stock (if provided) - this is to handle the item count for a stock
        // It should be here, outside the 'if (!matchResult)' block.
        if (initialQuantity !== null && initialQuantityUnitOfMeasure) {
            const normalizedInitialUnit = normalizeUnitName(initialQuantityUnitOfMeasure);
            let quantityInBaseUnitsToAdd: number | undefined = undefined;

            if (!product.baseUnitOfMeasure) {
                const prompt = `I received your request to add ${initialQuantity} ${initialQuantityUnitOfMeasure} of ${productName}, but I first need to know its smallest tracking unit.`;
                
                clarificationRequests.push({
                    type: 'STOCK_UPDATE_DEFERRED',
                    productName: productName,
                    prompt: prompt,
                    dataNeeded: {
                        originalQuantity: initialQuantity,
                        originalUnit: initialQuantityUnitOfMeasure,
                        valueType: 'quantity'
                    }
                });
                logger.warn(`Queued STOCK_UPDATE_DEFERRED for ${productName} due to missing base unit.`);
                return {
                    success: false,
                    needsClarification: true,
                    clarificationRequests,
                    message: prompt
                };
                
                
            } else if (normalizedInitialUnit === product.baseUnitOfMeasure) {
                quantityInBaseUnitsToAdd = initialQuantity;
            } else {
                if(!product.alternativeUnits){ 
                    product.alternativeUnits = []
                }
                const altUnit = product.alternativeUnits.find(au => au.unitName === normalizedInitialUnit);
                if (altUnit) {
                    quantityInBaseUnitsToAdd = initialQuantity! * altUnit.conversionFactorToBase;
                } else {
                    const prompt = `To add ${initialQuantity} ${initialQuantityUnitOfMeasure} of ${productName} to stock, I need to know how many ${product.baseUnitOfMeasure} are in one ${initialQuantityUnitOfMeasure}.`;
                    clarificationRequests.push({
                        type: 'UNIT_CONVERSION_REQUIRED',
                        productName: productName,
                        prompt: prompt,
                        dataNeeded: {
                            unitName: normalizedInitialUnit,
                            targetUnit: product.baseUnitOfMeasure,
                            originalQuantity: initialQuantity,
                            originalUnit: initialQuantityUnitOfMeasure,
                            valueType: 'quantity'
                        }
                    });
                    logger.warn(`Queued UNIT_CONVERSION_REQUIRED for initial stock of ${productName}`);
                    return{ 
                        success: false, 
                        needsClarification: true,
                        clarificationRequests,
                        message: prompt

                    }
                }
            }

            if (quantityInBaseUnitsToAdd !== undefined) {
                product.currentStockInBaseUnits += quantityInBaseUnitsToAdd;
                logger.info(`Initial stock updated for ${productName}: ${quantityInBaseUnitsToAdd} ${product.baseUnitOfMeasure}`);
            }
        }

        
        // 3. Process Standard Selling Price (if provided)
        // This logic remains the same as in my previous full code example.
        // It should be here, outside the 'if (!matchResult)' block.
        if (price !== null && priceUnitOfMeasure) {
            const normalizedPriceUnit = normalizeUnitName(priceUnitOfMeasure);
            let sellingPricePerBaseUnit: number | undefined = undefined;

            if (!product.baseUnitOfMeasure) {
                const prompt = `I received your price of NGN ${price} per ${priceUnitOfMeasure} for ${productName}, but I first need to know its smallest tracking unit.`;
                clarificationRequests.push({
                    type: 'SELLING_PRICE_REQUIRED',
                    productName: productName,
                    prompt: prompt,
                    dataNeeded: {
                        originalPrice: price,
                        originalPriceUnit: priceUnitOfMeasure,
                        valueType: 'price'
                    }
                });
                logger.warn(`Queued SELLING_PRICE_REQUIRED (deferred) for ${productName} due to missing base unit.`);
                return{ 
                    success: false, 
                    needsClarification: true,
                    clarificationRequests,
                    message: prompt

                }
            } else if (normalizedPriceUnit === product.baseUnitOfMeasure) {
                sellingPricePerBaseUnit = price;
            } else {
                if(!product.alternativeUnits){ 
                    product.alternativeUnits = []
                }
                const altUnit = product.alternativeUnits.find(au => au.unitName === normalizedPriceUnit) 
                if (altUnit) {
                    sellingPricePerBaseUnit = price! / altUnit.conversionFactorToBase;
                } else {
                    const prompt = `To set the selling price of ${productName} at NGN ${price} per ${priceUnitOfMeasure}, I need to know how many ${product.baseUnitOfMeasure} are in one ${priceUnitOfMeasure}.`;
                    clarificationRequests.push({
                        type: 'UNIT_CONVERSION_REQUIRED',
                        productName: productName,
                        prompt: prompt,
                        dataNeeded: {
                            unitName: normalizedPriceUnit,
                            targetUnit: product.baseUnitOfMeasure,
                            originalPrice: price,
                            originalPriceUnit: priceUnitOfMeasure,
                            valueType: 'price'
                        }
                    });
                    logger.warn(`Queued UNIT_CONVERSION_REQUIRED for selling price of ${productName}`);
                    return{ 
                        success: false, 
                        needsClarification: true,
                        clarificationRequests,
                        message: prompt

                    }
                }
            }

            if (sellingPricePerBaseUnit !== null) {
                product.standardSellingPricePerBaseUnit = sellingPricePerBaseUnit;
                logger.info(`Standard selling price updated for ${productName}: ${sellingPricePerBaseUnit} per ${product.baseUnitOfMeasure}`);
            }
        } 
        // else if (!product.standardSellingPricePerBaseUnit && product.baseUnitOfMeasure) { // Only prompt if base unit is known and no price yet
        //     const prompt = `What's the usual selling price for one ${product.baseUnitOfMeasure} of ${productName}?`;
        //     clarificationRequests.push({
        //         type: 'SELLING_PRICE_REQUIRED',
        //         productName: productName,
        //         prompt: prompt,
        //         dataNeeded: { productName: productName, valueType: 'price' }
        //     });
        //     logger.info(`Queued SELLING_PRICE_REQUIRED for ${productName} (no price given).`);
        //     return{ 
        //         success: false, 
        //         needsClarification: true,
        //         clarificationRequests,
        //         message: prompt

        //     }
        // }

        await product.save()
        // handle adding the pending request to the database 
        
        
        return {
            success: true,
            needsClarification: false,
            message: `Successfully ${matchResult ? 'updated' : 'added'} product: ${productName}`,
            product
        };
    }

    formatInventoryList(products: IInventoryV2[]): string {
        if (products.length === 0) {
            return "Your inventory is empty. Use 'add [product name] [qty] [price]' to add products.";
        }
    
        let result = `📦 *Current Inventory* 📦\n\n`;
        
        // Calculate total inventory value
        // during this calculation, use the standardSellingPricePerBaseUnit that is not null or undefined
        const totalValue = products.reduce((sum, product) => sum + (product.currentStockInBaseUnits * product.standardSellingPricePerBaseUnit!), 0);
        
        // Add total inventory value
        result += `💰 *Total Inventory Value:* ₦${totalValue.toLocaleString()}\n\n`;
    
        // Process each category
        products.forEach((product, index) => {
            result += `📋 *${product.name}*\n`;
            
            // Add a line break before each product (except the first) for better separation
            if (index > 0) {
                result += `\n`;
                }
                
                // Use bold for the product name and include the index
                result += `${index + 1}. *${product.name}*\n`; 
                
                // Put quantity and price on separate lines with emojis for clarity and add indentation
                result += `   📊 Quantity: ${product.currentStockInBaseUnits} units\n`; 
                result += `   💰 Price: ₦${product.standardSellingPricePerBaseUnit!.toLocaleString()}\n`;
                
                // Add low stock warning if quantity is below 5
                    if (product.currentStockInBaseUnits < 5) {
                    result += `   ⚠️ *Low Stock Warning*\n`;
                }
            });
            
        result += `\n`;
        
        return result;
      }
}

export default new NewInventoryService()