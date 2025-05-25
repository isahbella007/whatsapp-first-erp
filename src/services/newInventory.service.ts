import { CommandContext } from "../interfaces/command.interface";
import { IInventoryV2 } from "../interfaces/inventory.interface";
import { NewInventory } from "../models/newInventory";
import logger from "../utils/logger";
import { getBestProductMatch } from "../utils/productMatching";
import { ProductParams } from "./commands/products/add-product.command";

const ALLOWED_UNITS = ['bottle', 'piece', 'kg', 'gram', 'liter', 'ml', 'box', 'crate', 'dozen', 'pack', 'bag', 'unit', 'meter', 'cm'] as const;
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
        const { user, clarificationRequests } = context; // Use clarificationRequests as per our shared interface
        const { productName, price, priceUnitOfMeasure, initialQuantity, initialQuantityUnitOfMeasure, conversionFactorProvided } = productData;
        const userId = user._id as string;  // Type assertion to string since we know it's a string

        logger.info(`Executing AddProductCommand for ${productName}`);

        // Product Lookup
        const matchResult = await getBestProductMatch(userId, productName);
        let product: IInventoryV2; // Declare product variable here

        if (!matchResult) {
            // --- NEW PRODUCT CREATION ---
            logger.info(`Product '${productName}' not found. Creating new product.`);
            product = new NewInventory({ // Assign the new instance directly to 'product'
                name: productName,
                currentStockInBaseUnits: 0,
                alternativeUnits: [],
                standardSellingPricePerBaseUnit: null,
                baseUnitOfMeasure: null, // Will determine below
                costPricePerBaseUnit: null,
                user: userId, // Assuming your InventorySchema has a 'user' field for ownership
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
                }
            } else if (initialQuantityUnitOfMeasure ) {
                const normalizedInitialUnit = normalizeUnitName(initialQuantityUnitOfMeasure)
                if(normalizedInitialUnit && !['crate', 'carton', 'box', 'dozen'].includes(normalizedInitialUnit))
                product.baseUnitOfMeasure = normalizedInitialUnit
                logger.info(`Base unit inferred from initial quantity unit: ${product.baseUnitOfMeasure}`);
            } else {
                // Cannot determine base unit from input, queue clarification
                const prompt = `What's the smallest unit you use to track and sell ${productName}? (e.g., 'piece', 'bottle', 'kg', 'pack')`;
                if (clarificationRequests) {
                    clarificationRequests.push({
                        type: 'BASE_UNIT_DEFINITION_REQUIRED',
                        productName: productName,
                        prompt: prompt,
                        dataNeeded: {
                            valueType: 'quantity'
                        }
                    });
                    logger.info(`Queued BASE_UNIT_DEFINITION_REQUIRED for ${productName}`);
                }
                return clarificationRequests
            }
        } else {
            // --- EXISTING PRODUCT ---
            logger.info(`Existing product '${productName}' found with confidence ${matchResult.confidence}. ID: ${matchResult.product._id}`);
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

        await product.save()
        // 2. Process Initial Stock (if provided)
        // It should be here, outside the 'if (!matchResult)' block.
        // if (initialQuantity !== null && initialQuantityUnitOfMeasure) {
        //     const normalizedInitialUnit = normalizeUnitName(initialQuantityUnitOfMeasure);
        //     let quantityInBaseUnitsToAdd: number | null = null;

        //     if (!product.baseUnitOfMeasure) {
        //         const prompt = `I received your request to add ${initialQuantity} ${initialQuantityUnitOfMeasure} of ${productName}, but I first need to know its smallest tracking unit.`;
        //         if(clarificationRequests){ 
        //             clarificationRequests.push({
        //                 type: 'STOCK_UPDATE_DEFERRED',
        //                 productName: productName,
        //                 prompt: prompt,
        //                 dataNeeded: {
        //                     originalQuantity: initialQuantity,
        //                     originalUnit: initialQuantityUnitOfMeasure,
        //                     valueType: 'quantity'
        //                 }
        //             });
        //         }
                
        //         logger.info(`Queued STOCK_UPDATE_DEFERRED for ${productName} due to missing base unit.`);
        //     } else if (normalizedInitialUnit === product.baseUnitOfMeasure) {
        //         quantityInBaseUnitsToAdd = initialQuantity;
        //     } else {
        //         const altUnit = product.alternativeUnits.find(au => au.unitName === normalizedInitialUnit);
        //         if (altUnit) {
        //             quantityInBaseUnitsToAdd = initialQuantity * altUnit.conversionFactorToBase;
        //         } else {
        //             const prompt = `To add ${initialQuantity} ${initialQuantityUnitOfMeasure} of ${productName} to stock, I need to know how many ${product.baseUnitOfMeasure} are in one ${initialQuantityUnitOfMeasure}.`;
        //             if(clarificationRequests){ 
        //                 clarificationRequests.push({
        //                     type: 'UNIT_CONVERSION_REQUIRED',
        //                     productName: productName,
        //                     prompt: prompt,
        //                     dataNeeded: {
        //                         unitName: normalizedInitialUnit,
        //                         targetUnit: product.baseUnitOfMeasure,
        //                         originalQuantity: initialQuantity,
        //                         originalUnit: initialQuantityUnitOfMeasure,
        //                         valueType: 'quantity'
        //                     }
        //                 });
        //             }
                    
        //             logger.info(`Queued UNIT_CONVERSION_REQUIRED for initial stock of ${productName}`);
        //         }
        //     }

        //     if (quantityInBaseUnitsToAdd !== null) {
        //         product.currentStockInBaseUnits += quantityInBaseUnitsToAdd;
        //         logger.info(`Initial stock updated for ${productName}: ${quantityInBaseUnitsToAdd} ${product.baseUnitOfMeasure}`);
        //     }
        // }

        // 3. Process Standard Selling Price (if provided)
        // This logic remains the same as in my previous full code example.
        // It should be here, outside the 'if (!matchResult)' block.
        
    }
}

export default new NewInventoryService()