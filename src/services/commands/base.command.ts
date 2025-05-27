import { Command, CommandContext } from '../../interfaces/command.interface';
import twilioService from '../twilio.service';

/**
 * Base command abstract class
 */
export abstract class BaseCommand implements Command {
  abstract name: string;
  abstract description: string;
  abstract examples: string[];
  
  abstract execute(context: CommandContext): Promise<any>;
  
  matches(command: string): boolean {
    // Default implementation to be overridden by subclasses
    return false;
  }
  
  protected async sendResponse(phone: string, message: string): Promise<void> {
    await twilioService.sendTextMessage(phone, message);
  }

  // New method to get command intent
  getIntent(): string {
    return this.name;
  }
} 