import { CommandContext } from '../../../interfaces/command.interface';
import inventoryService from '../../inventory.service';
import logger from '../../../utils/logger';
import { BaseCommand } from '../base.command';
import AppError from '../../../utils/errors/AppError';

/**
 * Update product details command - Updates product quantity and/or price
 */
export class UpdateQuantityCommand extends BaseCommand {
  name = 'update_product';
  description = 'Update product quantity and/or price';
  examples = [
    'update zobo 15',
    'update zobo price 1500',
    'update zobo 15 1500',
    'update zobo qty 15',
    'update zobo 15, fanta 10',
    'update zobo qty 15, malt price 200'
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
      const { name, qty, price, updateType } = context.params || {};
      if (!name) {
        await this.sendResponse(
          context.phone,
          '❌ Please specify the product name to update.'
        );
        return;
      }
      if (qty === undefined && price === undefined) {
        await this.sendResponse(
          context.phone,
          '❌ Please specify a quantity, price, or both to update.'
        );
        return;
      }
      // Update the product
      await inventoryService.updateProductDetails(
        name,
        context.user._id.toString(),
        {
          quantity: qty,
          price: price
        }
      );
      // Build response message
      const quantityString = qty !== undefined ? `(${qty} units)` : '';
      const priceString = price !== undefined ? `@ ₦${price?.toLocaleString()}` : '';
      const updateTypeString = updateType ? ` [${updateType}]` : '';
      const response = `✅ ${name} ${quantityString} ${priceString}${updateTypeString}\n\nSend "stock" to view all.`;
      // await this.sendResponse(context.phone, response);
    } catch (error) {
      logger.error('Error updating product:', error);
      await this.sendResponse(
        context.phone,
        error instanceof AppError
          ? error.message
          : `❌ There was an error processing your update product request.\n\n*Update Format Examples:*\n\n1️⃣ Update quantity only:\n   ➤ update zobo 15\n   ➤ update zobo qty 15\n\n2️⃣ Update price only:\n   ➤ update zobo price 1500\n\n3️⃣ Update both quantity and price:\n   ➤ update zobo 15 1500\n\n4️⃣ Update multiple products:\n   ➤ update zobo 15, fanta 10\n   ➤ update zobo qty 15, malt price 200`
      );
    }
  }
}