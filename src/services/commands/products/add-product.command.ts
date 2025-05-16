import { CommandContext } from '../../../interfaces/command.interface';
import { ProductCondition } from '../../../interfaces/inventory.interface';
import inventoryService from '../../inventory.service';
import logger from '../../../utils/logger';
import { BaseCommand } from '../base.command';
import AppError from '../../../utils/errors/AppError';

interface ProductParams {
  name: string;
  qty: number;
  price: number;
}

/**
 * Add product command - Adds a new product to inventory
 */
export class AddProductCommand extends BaseCommand {
  name = 'add_product';
  description = 'Add a new product to inventory';
  examples = ['add Smartphone XS', 'add Wireless Earbuds'];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return normalized.startsWith('add ') && normalized.length > 4;
  }
  
  async execute(context: CommandContext): Promise<void> {
    try {
      logger.info(`You get to the add product command`);
      // Get the pre-parsed params
      const params = context.params as ProductParams;
      if (!params || !params.name || !params.qty || !params.price) {
        throw new AppError('Invalid product data: name, quantity and price are required', 400);
      }

      logger.info(`Product data from params: ${JSON.stringify(params)}`);

      try {
        // Make sure user ID exists and is a valid string
        if (!context.user || !context.user._id) {
          throw new Error('User ID is missing');
        }

        // Create the product
        await inventoryService.addProduct(
          context.user._id.toString(),
          {
            name: params.name,
            quantity: params.qty,
            description: `Description for ${params.name}`,
            sku: `SKU-${Date.now()}`,
            category: 'General',
            price: params.price,
            condition: ProductCondition.NEW,
          }
        );
        
      } catch (error) {
        logger.error('Error adding product:', error);
        await this.sendResponse(
          context.phone,
          error instanceof AppError 
            ? error.message
            : "There was an error processing your request. Please try again later."
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