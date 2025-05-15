import { CommandContext } from '../../interfaces/command.interface';
import { BaseCommand } from './base.command';

/**
 * Account category command - Shows account settings
 */
export class AccountCategoryCommand extends BaseCommand {
  name = 'account';
  description = 'Show account settings';
  examples = ['5', 'profile', 'account'];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return ['5', 'profile', 'account'].includes(normalized);
  }
  
  async execute(context: CommandContext): Promise<void> {
    const accountMenu = `
🔹 *Account Settings* 🔹

Available commands:
- "profile" - View your profile
- "update profile" - Update your details
- "subscription" - View subscription info

Type "menu" to return to the main menu.
`;
    await this.sendResponse(context.phone, accountMenu);
  }
}