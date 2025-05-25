import { CommandContext } from '../../../interfaces/command.interface';
import { ProductCondition } from '../../../interfaces/inventory.interface';
import inventoryService from '../../inventory.service';
import logger from '../../../utils/logger';
import { BaseCommand } from '../base.command';
import AppError from '../../../utils/errors/AppError';
import newInventoryService from '../../newInventory.service';

export interface ProductParams {
  productName: string, 
  price?: number,
  priceUnitOfMeasure?: string, 
  initialQuantity?: number,
  initialQuantityUnitOfMeasure?: string, 
  conversionFactorProvided?: { 
    unit1: string, 
    unit1Quantity: number,
    unit2: string,
    unit2Quantity: number
  }
}

/**
 * Add product command - Adds a new product to inventory
 */
export class AddProductCommand extends BaseCommand {
  name = 'add_product';
  description = 'Add a new product to inventory';
  examples = ['add Smartphone XS', 'add Wireless Earbuds'];
  
  async execute(context: CommandContext): Promise<void> {
    try{ 
      
      if(!context.user || !context.user._id){ 
        throw new AppError('The user id is required. Contact support', 400)
      }
      const params = context.params as ProductParams
      await newInventoryService.addProduct(context, params)
    }catch(error){ 
      logger.error('Something went wrong when adding a stock')
    }
  }
} 