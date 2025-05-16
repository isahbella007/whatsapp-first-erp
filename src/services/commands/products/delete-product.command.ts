import { CommandContext } from '../../../interfaces/command.interface';
import AppError from '../../../utils/errors/AppError';
import logger from '../../../utils/logger';
import { parseProductsToDelete } from '../../../utils/parser/delete-command-parser';
import inventoryService from '../../inventory.service';
import { BaseCommand } from '../base.command';

/**
 * Delete product command - Removes products from inventory
 */
export class DeleteProductCommand extends BaseCommand {
  name = 'delete';
  description = 'Delete one or more products from inventory';
  examples = [
    'delete Smartphone XS', 
    'delete Wireless Earbuds', 
    'delete zobo, eba, rice', 
    'delete zobo delete eba delete rice',
    'delete zobo\ndelete eba'
  ];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    // Only match commands that start with 'delete ' and don't contain 'customer delete'
    return normalized.startsWith('delete ') && !normalized.includes('customer delete');
  }
  
  async execute(context: CommandContext): Promise<void> {
    try {
      // Make sure user ID exists and is a valid string
      if (!context.user || !context.user._id) {
        throw new Error('User ID is missing');
      }
      
      const userId = context.user._id.toString();
      const rawInput = context.rawCommand;
      
      try {
        // Parse product names to delete
        const productsToDelete = parseProductsToDelete(rawInput);
        
        logger.info(`Attempting to delete products: ${productsToDelete.join(', ')}`);
        
        // Use the batch delete method from inventory service
        const results = await inventoryService.deleteMultipleProducts(productsToDelete, userId);
        
        // Format the response message
        let responseMessage = '';
        
        if (results.deleted.length > 0) {
          responseMessage += `✅ Product${results.deleted.length > 1 ? 's' : ''} deleted: ${results.deleted.join(', ')}\n\n`;
        }
        
        if (results.notFound.length > 0) {
          responseMessage += `❌ Product${results.notFound.length > 1 ? 's' : ''} not found: ${results.notFound.join(', ')}\n\n`;
        }
        
        // Get updated inventory list
        const products = await inventoryService.getProducts(userId);
        const inventoryList = inventoryService.formatInventoryList(products);
        
        await this.sendResponse(context.phone, `${responseMessage}${inventoryList}`);
      } catch (error) {
        logger.error('Error in DeleteProductCommand:', error);
        await this.sendResponse(
          context.phone,
          error instanceof AppError ? error.message : "Format error: Please use 'delete product-name' (e.g. delete zobo)"
        );
      }
    } catch (error) {
      logger.error('Error in DeleteProductCommand:', error);
      await this.sendResponse(
        context.phone,
        "There was an error processing your request. Please try again later."
      );
    }
  }
} 