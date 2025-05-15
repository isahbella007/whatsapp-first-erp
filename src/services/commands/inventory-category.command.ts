import { CommandContext } from '../../interfaces/command.interface';
import { BaseCommand } from './base.command';

/**
 * Inventory category command - Shows inventory management options
 */
export class InventoryCategoryCommand extends BaseCommand {
  name = 'inventory';
  description = 'Show inventory management options';
  examples = ['1', 'inventory', 'stock'];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return ['1', 'inventory', 'stock'].includes(normalized);
  }
  
  async execute(context: CommandContext): Promise<void> {
    const inventoryMenu = `
🔹 *Inventory Management* 🔹

Available commands:
- "add [product name]" - Add a new product
- "stock" - View current inventory
- "update [product] [quantity]" - Update product quantity

Example: add Smartphone XS
Example: update Smartphone XS 10

Type "menu" to return to the main menu.
`;
    await this.sendResponse(context.phone, inventoryMenu);
  }
} 