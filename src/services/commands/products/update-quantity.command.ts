import { CommandContext } from '../../../interfaces/command.interface';
import inventoryService from '../../inventory.service';
import logger from '../../../utils/logger';
import { BaseCommand } from '../base.command';
import AppError from '../../../utils/errors/AppError';
import { ProductParams } from './add-product.command';
import newInventoryService from '../../newInventory.service';

/**
 * Update product details command - Updates product quantity and/or price
 */
export class UpdateQuantityCommand extends BaseCommand {
  name = 'update_product';
  description = 'Update product quantity and/or price';
  examples = ['I have 50 packs of biscuits. One carton is 10 packs.'];


  async execute(context: CommandContext): Promise<void> {
    try {
      if (!context.user || !context.user._id) {
        throw new AppError('User ID is missing', 400);
      }
      const params = context.params as ProductParams
      const response = await newInventoryService.addProduct(context, params)
    } catch (error) {
      logger.error('Error updating product:', error);
      
    }
  }
}