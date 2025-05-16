import { CommandContext } from '../../../interfaces/command.interface';
import logger from '../../../utils/logger';
import { BaseCommand } from '../base.command';
import AppError from '../../../utils/errors/AppError';
import customerService from '../../customer.service';
import { CustomerParams } from './add-customer.command';

/**
 * Delete customer command - Deletes a customer
 */
export class DeleteCustomerCommand extends BaseCommand {
  name = 'delete_customer';
  description = 'Delete a customer';
  examples = ['delete_customer customer-name'];
  
  
  async execute(context: CommandContext): Promise<void> {
    try {
      if(!context.user || !context.user._id){
        throw new Error('User ID is missing');
      }

      // Use the pre-parsed data from command parser
      const params = context.params as CustomerParams;
      if (!params || !params.name) {
        throw new AppError('Invalid customer data: name is required', 400);
      }
      
      logger.info(`Customer data from params: ${JSON.stringify(params)}`);

      await customerService.deleteCustomer(
        params.name,
        context.user._id.toString()
      );

      // Get all customers and send the updated list
      const customers = await customerService.getCustomers(context.user._id.toString());
      const responseMessage = customerService.formatCustomerList(customers);
      
      // await this.sendResponse(
      //   context.phone,
      //   responseMessage
      // );
    } catch (error) {
      logger.error('Error in AddCustomerCommand:', error);
      await this.sendResponse(
        context.phone,
        error instanceof AppError 
          ? error.message
          : "There was an error processing your request. Please try again later."
      );
    }
  }
} 