import { CommandContext } from '../../interfaces/command.interface';
import { BaseCommand } from './base.command';

/**
 * Order category command - Shows order processing options
 */
export class OrderCategoryCommand extends BaseCommand {
  name = 'order';
  description = 'Show order processing options';
  examples = ['2', 'order'];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return ['2', 'order'].includes(normalized);
  }
  
  async execute(context: CommandContext): Promise<void> {
    const orderMenu = `
🔹 *Order Processing* 🔹

Available commands:
- "order [product] [quantity]" - Create a new order
- "status [order ID]" - Check status of an order
- "cancel [order ID]" - Cancel an existing order

Example: order Smartphone XS 2
Example: status ORD123456

Type "menu" to return to the main menu.
`;
    await this.sendResponse(context.phone, orderMenu);
  }
} 