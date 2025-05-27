import { CommandContext } from '../../../interfaces/command.interface';
import inventoryService from '../../inventory.service';
import logger from '../../../utils/logger';
import { BaseCommand } from '../base.command';
import AppError from '../../../utils/errors/AppError';
import newInventoryService from '../../newInventory.service';

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
        throw new AppError('The user id is required. Contact support', 400)
      }
      
      const userId = context.user._id.toString();
      const params = context.params || {};

       // Add response to context for message handler
       if (!context.responses) {
        context.responses = [];
      }
      
        // Get all products first
        const allProducts = await newInventoryService.getProducts(userId);
        
        // Handle different stock check variations based on params
        if (params.type === 'low') {
          // Show only low stock items (less than 5 units)
          const lowStockProducts = allProducts.filter(p => p.currentStockInBaseUnits < 5);
          if (lowStockProducts.length === 0) {
            context.responses.push({
              success: true,
              message: "✅ All products are well stocked!"
            });
            return;
          }
          const stockList = newInventoryService.formatInventoryList(lowStockProducts);
          context.responses.push({
            success: true,
            message: `⚠️ *Low Stock Items* ⚠️\n\n${stockList}`
          });
          return;
        }
        
        if (params.category) {
          // Show products by category
          const categoryProducts = allProducts.filter(p => 
            p.category.toLowerCase() === params.category.toLowerCase()
          );
          if (categoryProducts.length === 0) {
            context.responses.push({
              success: true,
              message: `No products found in category "${params.category}". Available categories: ${[...new Set(allProducts.map(p => p.category))].join(', ')}`
            });
            return;
          }
          const stockList = newInventoryService.formatInventoryList(categoryProducts);
          context.responses.push({
            success: true,
            message: stockList
          });
          return;
        }
        
        if (params.query) {
          // Search for specific product
          const matchingProducts = allProducts.filter(p => 
            p.name.toLowerCase().includes(params.query.toLowerCase())
          );
          
          if (matchingProducts.length === 0) {
            context.responses.push({
              success: true,
              message: `No products found matching "${params.query}". Try checking your inventory with 'stock' to see all products.`
            });
            return;
          }
          
          const stockList = newInventoryService.formatInventoryList(matchingProducts);
          context.responses.push({
            success: true,
            message: stockList
          });
          return;
        }
        
        // If no specific params, show all inventory
        const stockList = newInventoryService.formatInventoryList(allProducts);
        context.responses.push({
          success: true,
          message: stockList
        });
        return;
        
      
    } catch (error) {
      logger.error('Error in CheckStockCommand:', error);
       // Add response to context for message handler
       if (!context.responses) {
        context.responses = [];
      }
      context.responses.push({
        success: false,
        message: error instanceof AppError 
          ? error.message 
          : "There was an error processing your request. Please try again later."
      });
    }
  }
} 