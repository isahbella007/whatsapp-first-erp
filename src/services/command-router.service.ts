import { Command } from '../interfaces/command.interface';
import { CommandContext } from '../interfaces/command.interface';
import logger from '../utils/logger';

export class CommandRouterService {
  private static instance: CommandRouterService;
  private commands: Map<string, Command> = new Map();

  private constructor() {}

  static getInstance(): CommandRouterService {
    if (!CommandRouterService.instance) {
      CommandRouterService.instance = new CommandRouterService();
    }
    return CommandRouterService.instance;
  }

  registerCommand(command: Command): void {
    this.commands.set(command.name, command);
  }

  async routeCommands(commands: Array<{ intent: string; params: Record<string, any> }>, context: CommandContext): Promise<string[]> {
    const responses: string[] = [];

    // logger.info(`In the command router service the commands are: ${JSON.stringify(commands)} and the context is: ${JSON.stringify(context)}`);
    for (const cmd of commands) {
      const command = this.commands.get(cmd.intent);
      // logger.info('The selected command is: ', command);
      if (!command) {
        responses.push(`Unknown command: ${cmd.intent}`);
        continue;
      }

      try {
        // Create a new context with the command parameters
        const commandContext: CommandContext = {
          ...context,
          params: cmd.params,
          intent: cmd.intent
        };

        // Execute the command
        await command.execute(commandContext);
        responses.push(`Successfully executed ${cmd.intent}`);
      } catch (error: any) {
        responses.push(`Error executing ${cmd.intent}: ${error.message}`);
      }
    }

    return responses;
  }
}

export const commandRouterService = CommandRouterService.getInstance(); 