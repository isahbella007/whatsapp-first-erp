import { CommandContext } from '../../../interfaces/command.interface';
import customerService from '../../customer.service';
import logger from '../../../utils/logger';
import { BaseCommand } from '../base.command';
import AppError from '../../../utils/errors/AppError';
import { ICustomer } from '../../../interfaces/customer.interface';

/**
 * Get customer command - Views customer details
 */
export class GetCustomerCommand extends BaseCommand {
  name = 'get_customer';
  description = 'View customer details';
  examples = [
    'customers',
    'view customers',
    'customer John Doe',
    'view customer John Doe',
    'search customer John',
    'find customer John'
  ];

  async execute(context: CommandContext): Promise<void> {
    try {
      if (!context.user || !context.user._id) {
        throw new AppError('User ID is missing', 400);
      }

      if(!context.responses){ 
        context.responses = []
      }
      const { viewType, name, searchTerm } = context.params || {};

      if (!viewType) {
        context.responses.push({ 
          success: false, 
          message: '❌ Invalid command format. Please use one of the following:\n\n' +
          '1️⃣ View all customers:\n' +
          '   ➤ customers\n' +
          '   ➤ view customers\n\n' +
          '2️⃣ View specific customer:\n' +
          '   ➤ customer [name]\n' +
          '   ➤ view customer [name]\n\n' +
          '3️⃣ Search customers:\n' +
          '   ➤ search customer [term]\n' +
          '   ➤ find customer [term]'
        })
        
        return;
      }

      let response: string;

      switch (viewType) {
        case 'all':
          const allCustomers = await customerService.getCustomers(context.user._id.toString());
          if (!allCustomers.length) {
            context.responses.push({
              success: true,
              message: '📝 No customers found.'
            })
            return;
          } else {
            // put the customers in the context
            response = '📋 *Customer List:*\n\n';
            allCustomers.forEach((customer: ICustomer, index: number) => {
              response += `${index + 1}. ${customer.name}\n`;
              if (customer.phone) response += `   📱 ${customer.phone}\n`;
              if (customer.tags?.length) response += `   🏷️ ${customer.tags.join(', ')}\n`;
              response += '\n';
            });
          }
          break;

        case 'single':
          if (!name) {
            context.responses.push({
              success: false,
              message: '❌ Please specify the customer name to view.'
            })
            return;
          }
          const customer = await customerService.getSpecificCustomer(name, context.user._id.toString());
          if (!customer) {
            context.responses.push({
              success: false,
              message: `❌ Customer "${name}" not found.`
            })
            return;
          } else {
            response = `👤 *Customer Details:*\n\n`;
            response += `Name: ${customer.name}\n`;
            if (customer.phone) response += `Phone: ${customer.phone}\n`;
            if (customer.tags?.length) response += `Tags: ${customer.tags.join(', ')}\n`;
          }
          break;

        case 'search':
          const searchNames = context.params?.searchNames;
          if (!searchNames?.length) {
            context.responses.push({
              success: false,
              message: '❌ Please specify at least one name to search for.'
            })
            return;
          }

          const searchResults = await customerService.getCustomers(context.user._id.toString());
          
          // Create a map of customers for efficient lookup
          const customerMap = new Map<string, ICustomer>();
          searchResults.forEach(customer => {
            customerMap.set(customer.name.toLowerCase(), customer);
          });

          // Search for each name and collect matches
          const matchedCustomers = new Set<ICustomer>();
          const normalizedSearchNames = searchNames.map((name: string) => name.toLowerCase().trim());
          
          normalizedSearchNames.forEach((searchName: string) => {
            // First try exact match
            const exactMatch = customerMap.get(searchName);
            if (exactMatch) {
              matchedCustomers.add(exactMatch);
              return;
            }

            // Then try partial matches
            for (const [customerName, customer] of customerMap) {
              if (customerName.includes(searchName) || searchName.includes(customerName)) {
                matchedCustomers.add(customer);
              }
            }
          });

          const matchedResults = Array.from(matchedCustomers);

          if (!matchedResults.length) {
            context.responses.push({
              success: false,
              message: `❌ No customers found matching "${normalizedSearchNames.join(', ')}".`
            })
            return;
          } else {
            response = `🔍 *Search Results:*\n\n`;
            matchedResults.forEach((customer: ICustomer, index: number) => {
              response += `${index + 1}. ${customer.name}\n`;
              if (customer.phone) response += `   📱 ${customer.phone}\n`;
              if (customer.tags?.length) response += `   🏷️ ${customer.tags.join(', ')}\n`;
              response += '\n';
            });
          }
          break;

        default:
          throw new AppError('Invalid view type', 400);
      }

      context.responses.push({
        success: true,
        message: response
      })
    } catch (error) {
      logger.error('Error getting customer details:', error);
      if(!context.responses){ 
        context.responses = []
      }
      context.responses.push({
        success: false,
        message: error instanceof AppError
          ? error.message
          : '❌ There was an error processing your request. Please try again later.'
      });
    }
  }
} 