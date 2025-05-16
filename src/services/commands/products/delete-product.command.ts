import { CommandContext } from '../../../interfaces/command.interface';
import inventoryService from '../../inventory.service';
import logger from '../../../utils/logger';
import { BaseCommand } from '../base.command';
import AppError from '../../../utils/errors/AppError';

/**
 * Delete product command - Removes a product from the inventory
 */
export class DeleteProductCommand extends BaseCommand {
  name = 'delete_product';
  description = 'Delete a product from the inventory';
  examples = [
    'delete zobo',
    'delete fanta',
    'delete Smartphone XS'
  ];

  matches(command: string): boolean {
    // This command is routed by intent, so always return true
    return true;
  }

  async execute(context: CommandContext): Promise<void> {
    try {
      if (!context.user || !context.user._id) {
        throw new AppError('User ID is missing', 400);
      }
      const { name } = context.params || {};
      if (!name) {
        await this.sendResponse(
          context.phone,
          '❌ Please specify the product name to delete.'
        );
        return;
      }
      // Delete the product
      await inventoryService.deleteProduct(name, context.user._id.toString());
      const response = `✅ Product "${name}" has been deleted.\n\nSend "stock" to view all.`;
      // await this.sendResponse(context.phone, response);
    } catch (error) {
      logger.error('Error deleting product:', error);
      await this.sendResponse(
        context.phone,
        error instanceof AppError
          ? error.message
          : '❌ There was an error processing your delete product request. Please try again later.'
      );
    }
  }
} 