import { CommandContext } from '../../../interfaces/command.interface';
import logger from '../../../utils/logger';
import { BaseCommand } from '../base.command';
import AppError from '../../../utils/errors/AppError';
import customerService from '../../customer.service';
import { parseAddCustomerWithLLM } from '../../../utils/parser/customer/add-customer-llm-parser';

/**
 * Add customer command - Adds a new customer
 */
export class AddCustomerCommand extends BaseCommand {
  name = 'customer add';
  description = 'Add a new customer';
  examples = ['customer add customer-name'];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return normalized.startsWith('customer add ') && normalized.length > 12;
  }
  
  async execute(context: CommandContext): Promise<void> {
    try {
      const customerName = context.rawCommand.replace(/^customer add\s+/i, '')?.trim();
      
      logger.info(`Customer name: ${customerName}`);
     

      
      try {
        if(!context.user || !context.user._id){
          throw new Error('User ID is missing');
        }

        const customerData = await parseAddCustomerWithLLM(customerName);
        logger.info(`Customer data: ${JSON.stringify(customerData)}`);

        for(const {name, phone, tags} of customerData){ 
            await customerService.addCustomer(
                context.user._id.toString(),
                {
                    name,
                    phone,
                    tags
                }
            )
        }
        // when all customers are added, get all the customers for the business owner and send the list
        const customers = await customerService.getCustomers(context.user._id.toString());
        const responseMessage = customerService.formatCustomerList(customers);

        
        await this.sendResponse(
          context.phone,
          responseMessage
        );
      } catch (error) {
        logger.error('Error adding product:', error);
        await this.sendResponse(
          context.phone,
          error instanceof AppError 
          ? error.message
          :"Format error: Please use 'add product-name quantity price' (e.g. add zobo 10 150)"
        );
      }
    } catch (error) {
      logger.error('Error in AddProductCommand:', error);
      await this.sendResponse(
        context.phone,
        "There was an error processing your request. Please try again later."
      );
    }
  }
} 