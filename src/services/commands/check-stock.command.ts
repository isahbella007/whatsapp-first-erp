import { CommandContext } from '../../interfaces/command.interface';
import inventoryService from '../inventory.service';
import logger from '../../utils/logger';
import { BaseCommand } from './base.command';

/**
 * Check stock command - Views current inventory
 */
export class CheckStockCommand extends BaseCommand {
  name = 'stock';
  description = 'View current inventory';
  examples = ['stock'];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return normalized === 'stock';
  }
  
  async execute(context: CommandContext): Promise<void> {
    try {
      try {
        // Make sure user ID exists and is a valid string
        if (!context.user || !context.user._id) {
          throw new Error('User ID is missing');
        }
        
        // Get user's products
        const products = await inventoryService.getProducts(context.user._id.toString());
        
        // Format the inventory list as a message
        const stockList = inventoryService.formatInventoryList(products);
        
        // Send the inventory list
        await this.sendResponse(context.phone, stockList);
      } catch (error) {
        logger.error('Error getting inventory:', error);
        
        // If there's an error, send the mock inventory for demonstration
        const mockInventory = inventoryService.getMockInventoryList();
        await this.sendResponse(context.phone, mockInventory);
      }
    } catch (error) {
      logger.error('Error in CheckStockCommand:', error);
      await this.sendResponse(
        context.phone,
        "There was an error processing your request. Please try again later."
      );
    }
  }
} 