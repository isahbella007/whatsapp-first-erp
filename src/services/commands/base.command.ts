import { Command, CommandContext } from '../../interfaces/command.interface';
import twilioService from '../twilio.service';

/**
 * Base command abstract class
 */
export abstract class BaseCommand implements Command {
  abstract name: string;
  abstract description: string;
  abstract examples: string[];
  
  abstract execute(context: CommandContext): Promise<void>;
  
  matches(command: string): boolean {
    // Default implementation to be overridden by subclasses
    return false;
  }
  
  protected async sendResponse(phone: string, message: string): Promise<void> {
    await twilioService.sendTextMessage(phone, message);
  }
} 