import { CommandContext } from '../../../interfaces/command.interface';
import inventoryService from '../../inventory.service';
import logger from '../../../utils/logger';
import { BaseCommand } from '../base.command';
import AppError from '../../../utils/errors/AppError';

/**
 * Check stock command - Views current inventory
 */
export class CheckStockCommand extends BaseCommand {
  name = 'check_stock';
  description = 'View current inventory';
  examples = [
    'stock',  // View all inventory
    'stock zobo',  // Check specific product
    'stock low',  // View low stock items
    'stock category drinks'  // View by category
  ];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return normalized === 'stock' || normalized.startsWith('stock ');
  }
  
  async execute(context: CommandContext): Promise<void> {
    try {
      // Make sure user ID exists and is a valid string
      if (!context.user || !context.user._id) {
        throw new Error('User ID is missing');
      }
      
      const userId = context.user._id.toString();
      const params = context.params || {};
      
      try {
        // Get all products first
        const allProducts = await inventoryService.getProducts(userId);
        
        // Handle different stock check variations based on params
        if (params.type === 'low') {
          // Show only low stock items (less than 5 units)
          const lowStockProducts = allProducts.filter(p => p.quantity < 5);
          if (lowStockProducts.length === 0) {
            await this.sendResponse(context.phone, "✅ All products are well stocked!");
            return;
          }
          const stockList = inventoryService.formatInventoryList(lowStockProducts);
          await this.sendResponse(context.phone, `⚠️ *Low Stock Items* ⚠️\n\n${stockList}`);
          return;
        }
        
        if (params.category) {
          // Show products by category
          const categoryProducts = allProducts.filter(p => 
            p.category.toLowerCase() === params.category.toLowerCase()
          );
          if (categoryProducts.length === 0) {
            await this.sendResponse(
              context.phone, 
              `No products found in category "${params.category}". Available categories: ${[...new Set(allProducts.map(p => p.category))].join(', ')}`
            );
            return;
          }
          const stockList = inventoryService.formatInventoryList(categoryProducts);
          await this.sendResponse(context.phone, stockList);
          return;
        }
        
        if (params.query) {
          // Search for specific product
          const matchingProducts = allProducts.filter(p => 
            p.name.toLowerCase().includes(params.query.toLowerCase())
          );
          
          if (matchingProducts.length === 0) {
            await this.sendResponse(
              context.phone,
              `No products found matching "${params.query}". Try checking your inventory with 'stock' to see all products.`
            );
            return;
          }
          
          const stockList = inventoryService.formatInventoryList(matchingProducts);
          await this.sendResponse(context.phone, stockList);
          return;
        }
        
        // If no specific params, show all inventory
        const stockList = inventoryService.formatInventoryList(allProducts);
        await this.sendResponse(context.phone, stockList);
        
      } catch (error) {
        logger.error('Error getting inventory:', error);
        throw new AppError(
          error instanceof AppError ? error.message : "Failed to retrieve inventory information",
          500
        );
      }
    } catch (error) {
      logger.error('Error in CheckStockCommand:', error);
      await this.sendResponse(
        context.phone,
        error instanceof AppError 
          ? error.message 
          : "There was an error processing your request. Please try again later."
      );
    }
  }
} 