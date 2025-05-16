import { CommandContext } from '../../../interfaces/command.interface';
import logger from '../../../utils/logger';
import { BaseCommand } from '../base.command';
import AppError from '../../../utils/errors/AppError';
import customerService from '../../customer.service';
import { parseDeleteCustomerWithLLM } from '../../../utils/parser/customer/delete-customer-parser';

/**
 * Delete customer command - Deletes a customer
 */
export class DeleteCustomerCommand extends BaseCommand {
  name = 'customer delete';
  description = 'Delete a customer';
  examples = ['customer delete customer-name'];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return normalized.startsWith('customer delete ') && normalized.length > 12;
  }
  
  async execute(context: CommandContext): Promise<void> {
    try {
      const entries = context.rawCommand.replace(/^customer delete\s+/i, '')?.trim();
      
      logger.info(`Customer entries: ${entries}`);
     

      
      try {
        if(!context.user || !context.user._id){
          throw new Error('User ID is missing');
        }

        const entryData = await parseDeleteCustomerWithLLM(entries);
        logger.info(`Entry data: ${entryData}`);
        await customerService.deleteCustomer(entryData, context.user._id.toString());
        await this.sendResponse(
          context.phone,
          `Customer ${entryData} deleted successfully`
        );
      } catch (error) {
        logger.error('Error deleting customer:', error);
        await this.sendResponse(
          context.phone,
          error instanceof AppError 
          ? error.message
          :"Format error: Please use 'delete customer customer-name'"
        );
      }
    } catch (error) {
      logger.error('Error in DeleteCustomerCommand:', error);
      await this.sendResponse(
        context.phone,
        "There was an error processing your request. Please try again later."
      );
    }
  }
} 