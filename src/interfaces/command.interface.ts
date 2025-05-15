import { IRedisUserData } from './redis.interface';
import { IUser } from './user.interface';

/**
 * Command context interface to pass data between commands
 */
export interface CommandContext {
  phone: string;
  user: IUser;
  userData: IRedisUserData;
  args: string[];
  rawCommand: string;
}

/**
 * Command interface
 */
export interface Command {
  name: string;
  description: string;
  examples: string[];
  execute(context: CommandContext): Promise<void>;
  matches(command: string): boolean;
}

/**
 * Command Registry interface
 */
export interface CommandRegistry {
  registerCommand(command: Command): void;
  findCommand(commandText: string): Command | null;
} 