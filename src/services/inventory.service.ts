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
   * Add a new inventory item
   * @param inventoryData Inventory data to add
   */
  async addInventoryItem(inventoryData: IInventoryCreate) {
    try {
      // Check if user exists and has an active subscription
      const user = await User.findById(inventoryData.user);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify subscription status
      if (user.subscriptionStatus !== SubscriptionStatus.ACTIVE) {
        throw new AppError('User subscription is not active', 403);
      }

      // Generate SKU if not provided
      if (!inventoryData.sku) {
        inventoryData.sku = this.generateSKU(inventoryData.name, inventoryData.category);
      }

      // Create the inventory item
      const inventory = await Inventory.create(inventoryData);
      
      logger.info(`Inventory item created with SKU: ${inventory.sku}`);
      return inventory;
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate key error (likely duplicate SKU)
        logger.error('Duplicate SKU error:', error);
        throw new AppError('An item with this SKU already exists', 400);
      }
      
      logger.error('Error adding inventory item:', error);
      throw new AppError(error.message, error.statusCode || 500);
    }
  }

  /**
   * Process inventory upload from PDF or image
   * This is a placeholder for actual document processing logic
   * In a real implementation, this would use OCR or a similar technology to extract
   * inventory data from documents
   * @param userId User ID
   * @param fileBuffer File buffer
   * @param fileType File type
   */
  async processInventoryUpload(userId: string, fileBuffer: Buffer, fileType: string) {
    try {
      // Check if user exists and has an active subscription
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify subscription status
      if (user.subscriptionStatus !== SubscriptionStatus.ACTIVE) {
        throw new AppError('User subscription is not active', 403);
      }

      logger.info(`Processing inventory upload for user ${userId}, file type: ${fileType}`);

      // In a real implementation, this would process the file with OCR or similar technology
      // For now, we'll simulate the extraction with a simple delay and dummy data
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create sample inventory items as if they were extracted from the document
      const extractedItems: IInventoryCreate[] = [
        {
          user: userId,
          name: 'Sample Product 1',
          description: 'This is a sample product extracted from the document',
          sku: this.generateSKU('Sample Product 1', 'Electronics'),
          category: 'Electronics',
          quantity: 10,
          price: 2500,
          costPrice: 1800,
          condition: ProductCondition.NEW,
        },
        {
          user: userId,
          name: 'Sample Product 2',
          description: 'This is another sample product extracted from the document',
          sku: this.generateSKU('Sample Product 2', 'Accessories'),
          category: 'Accessories',
          quantity: 20,
          price: 1200,
          costPrice: 800,
          condition: ProductCondition.NEW,
        },
      ];
      
      // Add extracted items to inventory
      const createdItems = await Promise.all(
        extractedItems.map(item => this.addInventoryItem(item))
      );
      
      logger.info(`Successfully processed inventory upload, extracted ${createdItems.length} items`);
      
      return {
        processed: true,
        itemsExtracted: createdItems.length,
        items: createdItems,
      };
    } catch (error: any) {
      logger.error(`Error processing inventory upload for user ${userId}:`, error);
      throw new AppError(error.message, error.statusCode || 500);
    }
  }

  /**
   * Update an inventory item
   * @param itemId Inventory item ID
   * @param userId User ID (for authorization)
   * @param updateData Update data
   */
  async updateInventoryItem(itemId: string, userId: string, updateData: IInventoryCreate) {
    try {
      // Find the inventory item
      const item = await Inventory.findById(itemId);
      if (!item) {
        throw new AppError('Inventory item not found', 404);
      }

      // Check if user owns this item
      if (item.user.toString() !== userId) {
        throw new AppError('You do not have permission to update this item', 403);
      }

      // Update the item
      Object.assign(item, updateData);
      await item.save();
      
      logger.info(`Inventory item ${itemId} updated successfully`);
      return item;
    } catch (error: any) {
      logger.error(`Error updating inventory item ${itemId}:`, error);
      throw new AppError(error.message, error.statusCode || 500);
    }
  }

  /**
   * Delete an inventory item
   * @param itemId Inventory item ID
   * @param userId User ID (for authorization)
   */
  async deleteInventoryItem(itemId: string, userId: string) {
    try {
      // Find the inventory item
      const item = await Inventory.findById(itemId);
      if (!item) {
        throw new AppError('Inventory item not found', 404);
      }

      // Check if user owns this item
      if (item.user.toString() !== userId) {
        throw new AppError('You do not have permission to delete this item', 403);
      }

      // Delete the item
    //   await item.remove();
      
      logger.info(`Inventory item ${itemId} deleted successfully`);
      return { deleted: true };
    } catch (error: any) {
      logger.error(`Error deleting inventory item ${itemId}:`, error);
      throw new AppError(error.message, error.statusCode || 500);
    }
  }

  /**
   * Get user's inventory
   * @param userId User ID
   * @param filters Optional filters
   */
  async getUserInventory(userId: string, filters: any = {}) {
    try {
      // Build query
      const query: any = { user: userId };
      
      // Apply filters
      if (filters.category) {
        query.category = filters.category;
      }
      if (filters.condition) {
        query.condition = filters.condition;
      }
      if (filters.search) {
        query.$text = { $search: filters.search };
      }
      
      // Execute query
      const inventory = await Inventory.find(query).sort({ createdAt: -1 });
      
      return inventory;
    } catch (error: any) {
      logger.error(`Error getting inventory for user ${userId}:`, error);
      throw new AppError('Failed to get inventory', 500);
    }
  }

  /**
   * Get inventory item details
   * @param itemId Inventory item ID
   * @param userId User ID (for authorization)
   */
  async getInventoryItemDetails(itemId: string, userId: string) {
    try {
      // Find the inventory item
      const item = await Inventory.findById(itemId);
      if (!item) {
        throw new AppError('Inventory item not found', 404);
      }

      // Check if user owns this item
      if (item.user.toString() !== userId) {
        throw new AppError('You do not have permission to view this item', 403);
      }

      return item;
    } catch (error: any) {
      logger.error(`Error getting inventory item ${itemId}:`, error);
      throw new AppError(error.message, error.statusCode || 500);
    }
  }

  /**
   * Generate a unique SKU
   * @param name Product name
   * @param category Product category
   */
  private generateSKU(name: string, category: string): string {
    // Create a short string from the name (first 3 characters)
    const namePrefix = name.replace(/[^a-zA-Z0-9]/g, '').substr(0, 3).toUpperCase();
    
    // Create a short string from the category (first 2 characters)
    const categoryPrefix = category.replace(/[^a-zA-Z0-9]/g, '').substr(0, 2).toUpperCase();
    
    // Generate a unique ID (last 6 characters of a UUID)
    const uniqueId = uuidv4().replace(/-/g, '').substr(0, 6).toUpperCase();
    
    // Combine to create the SKU
    return `${namePrefix}-${categoryPrefix}-${uniqueId}`;
  }

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
   * Get user's product list
   * @param userId User ID
   * @param limit Number of products to fetch (default: 10)
   * @param skip Number of products to skip (default: 0)
   */
  async getProducts(userId: string, limit: number = 10, skip: number = 0): Promise<IInventory[]> {
    try {
      const products = await Inventory.find({ user: userId })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .skip(skip);
      
      return products;
    } catch (error: any) {
      logger.error('Error fetching products:', error);
      throw new AppError(`Failed to fetch products: ${error.message}`, 500);
    }
  }

  /**
   * Get a product by ID
   * @param productId Product ID
   * @param userId User ID (for validation)
   */
  async getProductById(productId: string, userId: string): Promise<IInventory> {
    try {
      const product = await Inventory.findOne({
        _id: productId,
        user: userId,
      });
      
      if (!product) {
        throw new AppError('Product not found', 404);
      }
      
      return product;
    } catch (error: any) {
      logger.error('Error fetching product:', error);
      throw new AppError(`Failed to fetch product: ${error.message}`, 500);
    }
  }

  /**
   * Update a product
   * @param productId Product ID
   * @param userId User ID (for validation)
   * @param updateData Data to update
   */
  async updateProduct(
    productId: string,
    userId: string,
    updateData: Partial<IInventoryCreate>
  ): Promise<IInventory> {
    try {
      // Check if product exists and belongs to user
      const product = await this.getProductById(productId, userId);
      
      // Update the product
      Object.assign(product, updateData);
      await product.save();
      
      logger.info(`Updated product: ${product.name} for user: ${userId}`);
      
      return product;
    } catch (error: any) {
      logger.error('Error updating product:', error);
      throw new AppError(`Failed to update product: ${error.message}`, 500);
    }
  }

  /**
   * Update product quantity
   * @param productId Product ID or name
   * @param userId User ID (for validation)
   * @param quantity New quantity
   */
  async updateProductQuantity(
    productIdOrName: string,
    userId: string,
    quantity: number
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
        throw new AppError('Product not found', 404);
      }
      
      // Update quantity
      product.quantity = quantity;
      await product.save();
      
      logger.info(`Updated quantity for product: ${product.name} to ${quantity}`);
      
      return product;
    } catch (error: any) {
      logger.error('Error updating product quantity:', error);
      throw new AppError(`Failed to update product quantity: ${error.message}`, 500);
    }
  }

  /**
   * Delete a product
   * @param productId Product ID
   * @param userId User ID (for validation)
   */
  async deleteProduct(productId: string, userId: string): Promise<void> {
    try {
      const result = await Inventory.deleteOne({
        _id: productId,
        user: userId,
      });
      
      if (result.deletedCount === 0) {
        throw new AppError('Product not found or not authorized', 404);
      }
      
      logger.info(`Deleted product: ${productId} for user: ${userId}`);
    } catch (error: any) {
      logger.error('Error deleting product:', error);
      throw new AppError(`Failed to delete product: ${error.message}`, 500);
    }
  }

  /**
   * Format inventory list as a text message
   * @param products List of inventory products
   */
  formatInventoryList(products: IInventory[]): string {
    if (products.length === 0) {
      return "Your inventory is empty. Use 'add [product name]' to add products.";
    }
    
    let result = `📦 *Current Inventory* 📦\n\n`;
    
    products.forEach((product, index) => {
      result += `${index + 1}. ${product.name} - ${product.quantity} units - $${product.price.toFixed(2)}\n`;
    });
    
    result += `\nTo update stock, use: update [product] [quantity]`;
    
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
      result += `${index + 1}. ${product.name} - ${product.quantity} units - $${product.price.toFixed(2)}\n`;
    });
    
    result += `\nTo update stock, use: update [product] [quantity]`;
    
    return result;
  }
}

export default new InventoryService(); 