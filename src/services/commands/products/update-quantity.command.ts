import { CommandContext } from '../../../interfaces/command.interface';
import inventoryService from '../../inventory.service';
import logger from '../../../utils/logger';
import { BaseCommand } from '../base.command';
import { cleanPriceString } from '../../../utils/parser/cleanPrice';
import AppError from '../../../utils/errors/AppError';
import { parseUpdateInput } from '../../../utils/parser/update-command-parser';

/**
 * Update product details command - Updates product quantity and/or price
 */
export class UpdateQuantityCommand extends BaseCommand {
  name = 'update';
  description = 'Update product quantity and/or price';
  examples = [
    'update Smartphone XS 10', 
    'update Wireless Earbuds 25',
    'update Smartphone XS 10 999.99',
    'update Smartphone XS price 899.99',
    'update Smartphone XS qty 15',
    'update Smartphone 10, Earbuds 25, Watch 5'
  ];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return normalized.startsWith('update ') && normalized.length > 7;
  }
  
  async execute(context: CommandContext): Promise<void> {
    try{ 
      const productName = context.rawCommand.replace(/^add\s+/i, '').trim();
      logger.info(`product name ${productName}`)

      try{ 
         // Make sure user ID exists and is a valid string
         if (!context.user || !context.user._id) {
          throw new Error('User ID is missing');
        }

        const parsedCommand = parseUpdateInput(productName)
        logger.info(`the update entry after parsing ${JSON.stringify(parsedCommand)}`)

        const results: string[] = [];
        for(const {product, quantity, price} of parsedCommand){ 
          await inventoryService.updateProductDetails(
            product, 
            context.user._id.toString(),
            {
              quantity,
              price
            }
          )

          // make this dynamic because the price and quantity are optional
          const quantityString = quantity ? `(${quantity} units)` : '';
          const priceString = price ? `@ ₦${price?.toLocaleString() || 'N/A'}` : '';
          results.push(`✅ ${product} ${quantityString} ${priceString}`);
        }

        const response = ` ✅ Products Updated:\n` + results.join('\n');
        
        // build a single reply
        parsedCommand
        .map(i => `${i.product} (${i.quantity})`)
        .join(', ');
        await this.sendResponse(
          context.phone,
          `${response} \n\nSend "stock" to view all.`
        );
      }catch(error){ 
        // this means something went wrong when updating the product 
        logger.error('Error adding product:', error);
        await this.sendResponse(
          context.phone,
          error instanceof AppError 
          ? error.message
          :`📋 *Update Format Examples:*

1️⃣ Update quantity only:
   ➤ update zobo 15
   ➤ update zobo qty 15

2️⃣ Update price only:
   ➤ update zobo price 1500

3️⃣ Update both quantity and price:
   ➤ update zobo 15 1500

4️⃣ Update multiple products:
   ➤ update zobo 15, fanta 10
   ➤ update zobo qty 15, malt price 200
           `
        );
      }
    }catch(error){ 
      // this means it failed entirely
      logger.error('Error in AddProductCommand:', error);
      await this.sendResponse(
        context.phone,
        "There was an error processing your update product request. Please try again later."
      );
    }
  }
}