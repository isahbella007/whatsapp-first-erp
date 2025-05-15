import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import AppError from '../utils/errors/AppError';
import Inventory from '../models/Inventory';
import User from '../models/User';
import { IInventory, IInventoryCreate, ProductCondition } from '../interfaces/inventory.interface';
import { SubscriptionStatus } from '../interfaces/user.interface';

/**
 * Inventory Service for managing user inventory
 */
class InventoryService {

  /**
   * Add a product to the inventory
   * @param userId User ID
   * @param productData Product data
   */
  async addProduct(userId: string, productData: Partial<IInventoryCreate>): Promise<IInventory> {
    try {
      // Ensure we have a valid user ID
      const user = await User.findById(userId);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // Create the product in the inventory
      const product = await Inventory.create({
        user: userId,
        ...productData,
      });
      
      logger.info(`Created product: ${product.name} for user: ${userId}`);
      
      return product;
    } catch (error: any) {
      logger.error('Error creating product:', error);
      throw new AppError(`Failed to create product: ${error.message}`, 500);
    }
  }

  /**
   * Update product quantity and price in one operation
   * @param productIdOrName Product ID or name
   * @param userId User ID (for validation)
   * @param updates Object with quantity and/or price
   */
  async updateProductDetails(
    productIdOrName: string,
    userId: string,
    updates: { quantity?: number; price?: number }
  ): Promise<IInventory> {
    try {
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
          name: new RegExp(productIdOrName, 'i'), // Case-insensitive search
          user: userId,
        });
      }
      
      if (!product) {
        throw new AppError(`Product ${productIdOrName} not found`, 404);
      }
      
      // Update fields if provided
      if (updates.quantity !== undefined) {
        product.quantity = updates.quantity;
      }
      
      if (updates.price !== undefined) {
        product.price = updates.price;
      }
      
      await product.save();
      
      const updatedFields = [];
      if (updates.quantity !== undefined) updatedFields.push(`quantity: ${updates.quantity}`);
      if (updates.price !== undefined) updatedFields.push(`price: ${updates.price}`);
      
      logger.info(`Updated product: ${product.name} with ${updatedFields.join(', ')}`);
      
      return product;
    } catch (error: any) {
      logger.error('Error updating product details:', error);
      throw new AppError(`Failed to update product details: ${error.message}`, 500);
    }
  }


  // get all products for a user
  async getProducts(userId: string): Promise<IInventory[]> {
    return await Inventory.find({ user: userId });
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
        name: new RegExp(`^${productIdOrName}$`, 'i'), // Case-insensitive exact match
        user: userId,
      });
    }

    if (!product) {
      throw new AppError(`Product ${productIdOrName} not found`, 404);
    }

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

  /**
   * Format inventory list as a text message
   * @param products List of inventory products
   */
  formatInventoryList(products: IInventory[]): string {
    if (products.length === 0) {
        return "Your inventory is empty. Use 'add [product name] [qty] [price]' to add products.";
    }

    let result = `📦 *Current Inventory* 📦\n\n`;

    products.forEach((product, index) => {
        // Add a line break before each product (except the first) for better separation
        if (index > 0) {
            result += `\n`;
        }
        
        // Use bold for the product name and include the index
        result += `${index + 1}. *${product.name}*\n`; 
        
        // Put quantity and price on separate lines with emojis for clarity and add indentation
        result += `   📊 Quantity: ${product.quantity} units\n`; 
        result += `   💰 Price: ₦${product.price.toLocaleString()}\n`; 
    });

    return result;
}

  /**
   * Generate a mock inventory response for simulation
   */
  getMockInventoryList(): string {
    const mockProducts = [
      { name: 'Smartphone XS', quantity: 15, price: 999.99 },
      { name: 'Wireless Earbuds', quantity: 23, price: 129.99 },
      { name: 'Smart Watch', quantity: 7, price: 249.99 },
      { name: 'Laptop Pro', quantity: 5, price: 1499.99 },
    ];
    
    let result = `📦 *Current Inventory* 📦\n\n`;
    
    mockProducts.forEach((product, index) => {
      result += `${index + 1}. ${product.name} - ${product.quantity} units - ₦${product.price.toLocaleString()}\n`;
    });
    
    result += `\n*Update your inventory:*`;
    result += `\n• Update quantity: 'update [product] [qty]'`;
    result += `\n• Update price: 'update [product] price [price]'`;
    result += `\n• Update both: 'update [product] [qty] [price]'`;
    result += `\n• Multiple items: 'update [product1] [qty1], [product2] [qty2]'`;
    
    return result;
  }
}

export default new InventoryService(); 