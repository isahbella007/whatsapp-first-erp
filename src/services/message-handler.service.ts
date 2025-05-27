import { CommandContext } from '../interfaces/command.interface';
import { IRedisUserData } from '../interfaces/redis.interface';
import logger from '../utils/logger';
import { commandParserService } from './command-parser.service';
import { commandRouterService } from './command-router.service';
import { responseGeneratorService } from './response-generator.service';
import twilioService from './twilio.service';
import userService from './user.service';

export class MessageHandlerService {
  private static instance: MessageHandlerService;

  private constructor() {}

  static getInstance(): MessageHandlerService {
    if (!MessageHandlerService.instance) {
      MessageHandlerService.instance = new MessageHandlerService();
    }
    return MessageHandlerService.instance;
  }

  async handleMessage(phone: string, message: string, userData:IRedisUserData): Promise<void> {
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
    // Parse the message into commands
    const parseResult = await commandParserService.parseCommands(message);
    
    logger.info(`User intention: ${JSON.stringify(parseResult)}`);
    if (!parseResult.success || !parseResult.data) {
      await twilioService.sendTextMessage(phone, parseResult.error || 'Failed to parse commands');
      return;
    }

    // Create command context
    const context: CommandContext = {
      phone,
      user,
      userData,
      args: [],
      rawCommand: message,
      params: {},
      clarificationRequests: []
    };

    // Route and execute commands
    const responses = await commandRouterService.routeCommands(parseResult.data, context);

    // Generate and send consolidated response
    const responseMessage = responseGeneratorService.generateConsolidatedResponse(context);

    logger.error('The final response is', responseMessage)
    // await twilioService.sendTextMessage(phone, responseMessage);
  }
}

export const messageHandlerService = MessageHandlerService.getInstance(); 