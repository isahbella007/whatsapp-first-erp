import logger from '../utils/logger';
import { IRedisUserData } from '../interfaces/redis.interface';
import userService from './user.service';
import twilioService from './twilio.service';
import { CommandContext, CommandRegistry } from '../interfaces/command.interface';
import { BaseCommand } from './commands/base.command';

// Import commands
import { MenuCommand } from './commands/menu.command';
import { AddProductCommand } from './commands/products/add-product.command';
import { CheckStockCommand } from './commands/products/check-stock.command';
import { UpdateQuantityCommand } from './commands/products/update-quantity.command';
import { OrderCategoryCommand } from './commands/order-category.command';
import { ReportCategoryCommand } from './commands/report-category.command';
import { CustomerCategoryCommand } from './commands/customer-category.command';
import { AccountCategoryCommand } from './commands/account-category.command';
import { DeleteProductCommand } from './commands/products/delete-product.command';
/**
 * Command registry implementation for managing all available commands
 */
class CommandRegistryImpl implements CommandRegistry {
  private commands: BaseCommand[] = [];
  
  constructor() {
    // Register all commands
    this.registerCommand(new MenuCommand());
    this.registerCommand(new AddProductCommand());
    this.registerCommand(new CheckStockCommand());
    this.registerCommand(new UpdateQuantityCommand());
    this.registerCommand(new DeleteProductCommand());
    this.registerCommand(new OrderCategoryCommand());
    this.registerCommand(new ReportCategoryCommand());
    this.registerCommand(new CustomerCategoryCommand());
    this.registerCommand(new AccountCategoryCommand());
  }
  
  /**
   * Register a new command with the registry
   */
  registerCommand(command: BaseCommand): void {
    this.commands.push(command);
  }
  
  /**
   * Find a command that matches the given text
   */
  findCommand(commandText: string): BaseCommand | null {
    return this.commands.find(cmd => cmd.matches(commandText)) || null;
  }
}

/**
 * Command service for processing user commands
 */
class CommandService {
  private registry: CommandRegistry;
  
  constructor() {
    this.registry = new CommandRegistryImpl();
  }
  
  /**
   * Process a command from a user
   * @param phone User's phone number
   * @param commandText Command text
   * @param userData User's Redis data
   */
  async processCommand(
    phone: string, 
    commandText: string, 
    userData: IRedisUserData
  ): Promise<void> {
    try {
      // Find user in MongoDB
      const user = await userService.findOrCreateUser(phone);
      
      if (!user || !user._id) {
        logger.error('User not found or missing ID');
        await twilioService.sendTextMessage(
          phone,
          "There was a problem with your account. Please try again later."
        );
        return;
      }
      
      // Prepare command context
      const context: CommandContext = {
        phone,
        user,
        userData,
        args: commandText.split(' ').slice(1),
        rawCommand: commandText
      };
      
      // Find appropriate command handler
      const command = this.registry.findCommand(commandText);
      
      if (command) {
        // Execute the command
        await command.execute(context);
      } else {
        // Unknown command
        await twilioService.sendTextMessage(
          phone,
          "❌ Hmm, not sure what you meant. Type 'menu' for help."
        );
      }
    } catch (error) {
      logger.error('Error processing command:', error);
      await twilioService.sendTextMessage(
        phone,
        "There was an error processing your request. Please try again later."
      );
    }
  }
}

export default new CommandService(); 