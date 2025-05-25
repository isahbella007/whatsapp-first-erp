import { CommandContext } from '../interfaces/command.interface';
import logger from '../utils/logger';

export class ResponseGeneratorService {
  private static instance: ResponseGeneratorService;

  private constructor() {}

  static getInstance(): ResponseGeneratorService {
    if (!ResponseGeneratorService.instance) {
      ResponseGeneratorService.instance = new ResponseGeneratorService();
    }
    return ResponseGeneratorService.instance;
  }

  generateConsolidatedResponse(context: CommandContext): string {
    try {
      let responseMessage = "I've processed your message.";
      
      logger.info('Clarification context is', context.clarificationRequests)
      if (context.clarificationRequests && context.clarificationRequests.length > 0) {
        responseMessage += "\n\nHowever, I need some clarification:\n" + 
          context.clarificationRequests.join('\n');
      }

      logger.info(`Generated consolidated response: ${responseMessage}`);
      return responseMessage;
    } catch (error) {
      logger.error('Error generating consolidated response:', error);
      return "I've processed your message, but encountered some issues. Please try again.";
    }
  }
}

export const responseGeneratorService = ResponseGeneratorService.getInstance(); 