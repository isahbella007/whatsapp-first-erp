import { Command } from '../interfaces/command.interface';
import { commandRouterService } from './command-router.service';
import { AddProductCommand } from './commands/products/add-product.command';
import { DeleteProductCommand } from './commands/products/delete-product.command';
import { UpdateQuantityCommand } from './commands/products/update-quantity.command';
import { CheckStockCommand } from './commands/products/check-stock.command';
import { AddCustomerCommand } from './commands/customers/add-customer.command';
import { MenuCommand } from './commands/menu.command';
import { OrderCategoryCommand } from './commands/order-category.command';
import logger from '../utils/logger';
import { DeleteCustomerCommand } from './commands/customers/delete-customer.command';
import { GetCustomerCommand } from './commands/customers/get-customer.command';
import { RecordSaleCommand } from './commands/sales/record-sale.command';

export class CommandRegistryService {
  private static instance: CommandRegistryService;

  private constructor() {}

  static getInstance(): CommandRegistryService {
    if (!CommandRegistryService.instance) {
      CommandRegistryService.instance = new CommandRegistryService();
    }
    return CommandRegistryService.instance;
  }

  registerCommands(): void {
    // Register all commands
    const commands: Command[] = [
        // all product commands
      new AddProductCommand(),
      new DeleteProductCommand(),
      new UpdateQuantityCommand(),
      new CheckStockCommand(),

      // all customer commands
      new AddCustomerCommand(),
      new DeleteCustomerCommand(),
      new GetCustomerCommand(),
      new MenuCommand(),
      new OrderCategoryCommand(),

      // all sale commands
      new RecordSaleCommand()
    ];

    // Register each command with the router
    commands.forEach(command => {
      commandRouterService.registerCommand(command);
      logger.info(`Registered command: ${command.name}`);
    });
  }
}

export const commandRegistryService = CommandRegistryService.getInstance(); 