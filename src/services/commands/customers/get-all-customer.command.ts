import { CommandContext } from '../../../interfaces/command.interface';
import logger from '../../../utils/logger';
import { BaseCommand } from '../base.command';
import AppError from '../../../utils/errors/AppError';
import customerService from '../../customer.service';

/**
 * Get all customers command - Get all customers
 */
export class GetAllCustomerCommand extends BaseCommand {
  name = 'get all customers';
  description = 'Get all customers';
  examples = ['get all customers'];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return normalized.startsWith('get all customers') && normalized.length > 12;
  }
  
  async execute(context: CommandContext): Promise<void> {
    try {
      const command = context.rawCommand.replace(/^get all customers\s+/i, '')?.trim();
      
      logger.info(`Command: ${command}`);
     

      try {
        if(!context.user || !context.user._id){
          throw new Error('User ID is missing');
        }

        const customer = await customerService.getCustomers(context.user._id.toString());
        const responseMessage = customerService.formatCustomerList(customer);

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
          :"Format error: Please use 'get all customers'"
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