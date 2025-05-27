import { IClarificationRequestData } from '../models/PendingClarification';
import { IRedisUserData } from './redis.interface';
import { IUser } from './user.interface';

/**
 * Command context interface to pass data between commands
 */

export interface ClarificationRequest {
  type: 'UNIT_CONVERSION_REQUIRED' | 'SELLING_PRICE_REQUIRED' | 'PURCHASE_PRICE_REQUIRED' | 'BASE_UNIT_DEFINITION_REQUIRED' | 'STOCK_UPDATE_DEFERRED';
  productName?: string;
  prompt: string; // The message to send to the user
  dataNeeded: IClarificationRequestData; // Contextual data for resolution
}

export interface CommandContext {
  phone: string;
  user: IUser;
  userData: IRedisUserData;
  args: string[];
  rawCommand: string;
  params?: Record<string, any>;
  intent?: string;
  clarificationRequests?: ClarificationRequest[];
  responses?: Array<{
    success: boolean;
    needsClarification?: boolean;
    message: string;
    product?: any;
  }>;
}

/**
 * Command interface
 */
export interface Command {
  name: string;
  description: string;
  examples: string[];
  execute(context: CommandContext): Promise<any>;
  matches(command: string): boolean;
}

/**
 * Command Registry interface
 */
export interface CommandRegistry {
  registerCommand(command: Command): void;
  findCommand(commandText: string): Command | null;
} 