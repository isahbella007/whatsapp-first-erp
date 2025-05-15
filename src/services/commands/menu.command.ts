import { CommandContext } from '../../interfaces/command.interface';
import userService from '../user.service';
import { BaseCommand } from './base.command';

/**
 * Menu command - Shows the main menu
 */
export class MenuCommand extends BaseCommand {
  name = 'menu';
  description = 'Show the main menu';
  examples = ['menu', 'help'];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return normalized === 'menu' || normalized === 'help';
  }
  
  async execute(context: CommandContext): Promise<void> {
    await this.sendResponse(context.phone, userService.getMenuMessage());
  }
} 