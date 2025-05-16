import { CommandContext } from '../../../interfaces/command.interface';
import logger from '../../../utils/logger';
import { BaseCommand } from '../base.command';
import AppError from '../../../utils/errors/AppError';
import customerService from '../../customer.service';

/**
 * Get all customers command - Get all customers
 */
export class GetCustomerCommand extends BaseCommand {
  name = 'get customer';
  description = 'Get a customer';
  examples = ['get customer customer-name'];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return normalized.startsWith('get customer') && normalized.length > 12;
  }
  
  async execute(context: CommandContext): Promise<void> {
    try {
      const command = context.rawCommand.replace(/^get customer\s+/i, '')?.trim();
      
      logger.info(`Command: ${command}`);
     

      try {
        if(!context.user || !context.user._id){
          throw new Error('User ID is missing');
        }

        const customer = await customerService.getSpecificCustomer(command, context.user._id.toString());
        const responseMessage = customerService.formatCustomerList([customer]);

        await this.sendResponse(
          context.phone,
          responseMessage
        );
        
      } catch (error) {
        logger.error('Error getting all customers:', error);
        await this.sendResponse(
          context.phone,
          error instanceof AppError 
          ? error.message
          :"Format error: Please use 'get customer customer-name'"
        );
      }
    } catch (error) {
      logger.error('Error in GetAllCustomerCommand:', error);
      await this.sendResponse(
        context.phone,
        "There was an error processing your request. Please try again later."
      );
    }
  }
} 