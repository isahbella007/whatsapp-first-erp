import { CommandContext } from '../../interfaces/command.interface';
import { ProductCondition } from '../../interfaces/inventory.interface';
import inventoryService from '../inventory.service';
import logger from '../../utils/logger';
import { BaseCommand } from './base.command';
import { parseItemQuantityPrice } from '../../utils/parser/add-command-parser';
import AppError from '../../utils/errors/AppError';

/**
 * Add product command - Adds a new product to inventory
 */
export class AddProductCommand extends BaseCommand {
  name = 'add';
  description = 'Add a new product to inventory';
  examples = ['add Smartphone XS', 'add Wireless Earbuds'];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return normalized.startsWith('add ') && normalized.length > 4;
  }
  
  async execute(context: CommandContext): Promise<void> {
    try {
      const productName = context.rawCommand.replace(/^add\s+/i, '').trim();
      
      logger.info(`Product name: ${productName}`);
     

      
      try {
        // Make sure user ID exists and is a valid string
        if (!context.user || !context.user._id) {
          throw new Error('User ID is missing');
        }

        const productQuantities = parseItemQuantityPrice(productName);
        logger.info(`Product quantities: ${JSON.stringify(productQuantities)}`);

        const results: string[] = [];
        // Create the product
        for(const {product, quantity, price} of productQuantities){ 
          await inventoryService.addProduct(
            context.user._id.toString(),
            {
              name: product,
              quantity: quantity,
              description: `Description for ${product}`,
              sku: `SKU-${Date.now()}`,
              category: 'General',
              price: price,
              // costPrice: price,
              condition: ProductCondition.NEW,
            }
          )

          results.push(`✅ ${product} (${quantity} units @ ₦${price.toLocaleString()})`);
        }
        
        const response = ` ✅ Products added/updated:\n` + results.join('\n');
        // build a single reply
        const addedItems = productQuantities
        .map(i => `${i.product} (${i.quantity})`)
        .join(', ');
        await this.sendResponse(
          context.phone,
          `${response} \n\nSend "stock" to view all.`
        );

        // // Send success message
        // await this.sendResponse(
        //   context.phone,
        //   `✅ Product "${product.name}" has been added to your inventory.\n\nTo add stock, use: update ${product.name} [quantity]`
        // );
      } catch (error) {
        logger.error('Error adding product:', error);
        await this.sendResponse(
          context.phone,
          error instanceof AppError 
          ? error.message
          :"Format error: Please use 'add product-name quantity price' (e.g. add zobo 10 150)"
        );
      }
    } catch (error) {
      logger.error('Error in AddProductCommand:', error);
      await this.sendResponse(
        context.phone,
        "There was an error processing your request. Please try again later."
      );
    }
  }
} 