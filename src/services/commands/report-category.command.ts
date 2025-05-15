import { CommandContext } from '../../interfaces/command.interface';
import { BaseCommand } from './base.command';

/**
 * Report category command - Shows reporting options
 */
export class ReportCategoryCommand extends BaseCommand {
  name = 'report';
  description = 'Show reporting options';
  examples = ['3', 'report'];
  
  matches(command: string): boolean {
    const normalized = command.toLowerCase().trim();
    return ['3', 'report'].includes(normalized);
  }
  
  async execute(context: CommandContext): Promise<void> {
    const reportMenu = `
🔹 *Reports* 🔹

Available commands:
- "report daily" - View today's sales
- "report weekly" - View this week's sales
- "report monthly" - View this month's sales

Example: report daily

Type "menu" to return to the main menu.
`;
    await this.sendResponse(context.phone, reportMenu);
  }
} 