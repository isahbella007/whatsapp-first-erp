import { CommandContext } from '../../interfaces/command.interface';
import { BaseCommand } from './base.command';

/**
 * Customer category command - Shows customer management options
 */
export class CustomerCategoryCommand extends BaseCommand {
  name = 'customer';
  description = 'Show customer management options';
  examples = ['4', 'customer'];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return ['4', 'customer'].includes(normalized);
  }
  
  async execute(context: CommandContext): Promise<void> {
    const customerMenu = `
🔹 *Customer Management* 🔹

Available commands:
- "customer add [name] [contact]" - Add a new customer
- "customer find [name/contact]" - Find a customer
- "customer list" - List all customers

Example: customer add John Doe +1234567890
Example: customer find John

Type "menu" to return to the main menu.
`;
    await this.sendResponse(context.phone, customerMenu);
  }
} 