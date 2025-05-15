import { CommandContext } from '../../interfaces/command.interface';
import inventoryService from '../inventory.service';
import logger from '../../utils/logger';
import { BaseCommand } from './base.command';

/**
 * Update quantity command - Updates product quantity
 */
export class UpdateQuantityCommand extends BaseCommand {
  name = 'update';
  description = 'Update product quantity';
  examples = ['update Smartphone XS 10', 'update Wireless Earbuds 25'];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return normalized.startsWith('update ') && normalized.length > 7;
  }
  
  async execute(context: CommandContext): Promise<void> {
    try {
      // Parse the command parameters
      const commandParams = context.rawCommand.substring(7).trim();
      const parts = commandParams.split(' ');
      
      // The last part should be the quantity
      const quantity = parts.pop();
      
      // The rest is the product name
      const productName = parts.join(' ');
      
      if (!productName || !quantity || isNaN(Number(quantity))) {
        await this.sendResponse(
          context.phone,
          "Invalid format. Please use: update [product name] [quantity]"
        );
        return;
      }
      
      try {
        // Make sure user ID exists and is a valid string
        if (!context.user || !context.user._id) {
          throw new Error('User ID is missing');
        }
        
        // Update the product quantity
        const product = await inventoryService.updateProductQuantity(
          productName,
          context.user._id.toString(),
          Number(quantity)
        );
        
        // Send success message
        await this.sendResponse(
          context.phone,
          `✅ Updated stock for "${product.name}" to ${product.quantity} units.`
        );
      } catch (error: any) {
        logger.error('Error updating product quantity:', error);
        
        // If product not found
        if (error.message.includes('not found')) {
          await this.sendResponse(
            context.phone,
            `Product "${productName}" not found. Use 'add ${productName}' to add it first.`
          );
        } else {
          // Other errors
          await this.sendResponse(
            context.phone,
            "There was an error updating your product. Please try again later."
          );
        }
      }
    } catch (error) {
      logger.error('Error in UpdateQuantityCommand:', error);
      await this.sendResponse(
        context.phone,
        "There was an error processing your request. Please try again later."
      );
    }
  }
}