import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import AppError from '../utils/errors/AppError';
import Inventory from '../models/Inventory';
import User from '../models/User';
import { IInventory, IInventoryCreate, ProductCondition } from '../interfaces/inventory.interface';
import { SubscriptionStatus } from '../interfaces/user.interface';

class InventoryService {


  async getSpecificProduct(userId: string, productId: string): Promise<IInventory> { 
    const product = await Inventory.findOne({
      _id: productId,
      user: userId
    })

    if(!product){ 
      throw new AppError(`Product ${productId} not found`, 404);
    }

    return product;
  }

  /**
   * Delete a product from the inventory
   * @param productIdOrName Product ID or name
   * @param userId User ID
   */
  async deleteProduct(productIdOrName: string, userId: string): Promise<void> {
    // products are being deleted by name on whatsapp or the id if there is a web app
    let product;
      
    // Try to find by ID first
    try {
      product = await Inventory.findOne({
        _id: productIdOrName,
        user: userId,
      });
    } catch (e) {
      // If not a valid ID, search by name
      product = await Inventory.findOne({
        name: new RegExp(productIdOrName, 'i'), // Case-insensitive partial match
        user: userId,
      });
    }

    if (!product) {
      throw new AppError(`Product ${productIdOrName} not found`, 404);
    }

    //TODO: handle the case where multiple products are found
    await Inventory.findByIdAndDelete(product._id);
    logger.info(`Deleted product: ${product.name} for user: ${userId}`);
  }

  /**
   * Delete multiple products from inventory
   * @param productNames Array of product names
   * @param userId User ID
   * @returns Object with results of deletion operation
   */
  async deleteMultipleProducts(productNames: string[], userId: string): Promise<{
    deleted: string[];
    notFound: string[];
  }> {
    const results = {
      deleted: [] as string[],
      notFound: [] as string[],
    };

    for (const productName of productNames) {
      try {
        await this.deleteProduct(productName, userId);
        results.deleted.push(productName);
      } catch (error: any) {
        if (error instanceof AppError && error.statusCode === 404) {
          results.notFound.push(productName);
        } else {
          throw error; // Re-throw if it's not a "not found" error
        }
      }
    }

    return results;
  }

 
  formatInventoryList(products: IInventory[]): string {
    if (products.length === 0) {
        return "Your inventory is empty. Use 'add [product name] [qty] [price]' to add products.";
    }

    let result = `📦 *Current Inventory* 📦\n\n`;
    
    // Calculate total inventory value
    const totalValue = products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
    
    // Group products by category
    const productsByCategory = products.reduce((acc, product) => {
        const category = product.category || 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
    }, {} as Record<string, IInventory[]>);

    // Add total inventory value
    result += `💰 *Total Inventory Value:* ₦${totalValue.toLocaleString()}\n\n`;

    // Process each category
    Object.entries(productsByCategory).forEach(([category, categoryProducts]) => {
        result += `📋 *${category}*\n`;
        
        categoryProducts.forEach((product, index) => {
            // Add a line break before each product (except the first) for better separation
            if (index > 0) {
                result += `\n`;
            }
            
            // Use bold for the product name and include the index
            result += `${index + 1}. *${product.name}*\n`; 
            
            // Put quantity and price on separate lines with emojis for clarity and add indentation
            result += `   📊 Quantity: ${product.quantity} units\n`; 
            result += `   💰 Price: ₦${product.price.toLocaleString()}\n`;
            
            // Add low stock warning if quantity is below 5
            if (product.quantity < 5) {
                result += `   ⚠️ *Low Stock Warning*\n`;
            }
        });
        
        result += `\n`;
    });

    // Add quick action suggestions
    result += `\n💡 *Quick Actions:*\n`;
    result += `• Update stock: 'update [product] [qty]'\n`;
    result += `• Update price: 'update [product] price [price]'\n`;
    result += `• Add product: 'add [product] [qty] [price]'\n`;
    result += `• Delete product: 'delete [product]'\n`;

    return result;
  }

 
}

export default new InventoryService(); 