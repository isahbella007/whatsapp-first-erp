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
      logger.error(context.responses)
      let responseMessage = "I've processed your message.";
      
      // Handle responses
      if (context.responses && context.responses.length > 0) {
        const successResponses = context.responses.filter(r => r.success);
        const errorResponses = context.responses.filter(r => !r.success);
        
        if (successResponses.length > 0) {
          responseMessage = successResponses.map(r => r.message).join('\n');
        }
        
        if (errorResponses.length > 0) {
          responseMessage += "\n\nHowever, there were some issues:\n" + 
            errorResponses.map(r => r.message).join('\n');
        }

      }
      
      // Handle clarification requests
      if (context.clarificationRequests && context.clarificationRequests.length > 0) {
        responseMessage += "\n\nI need some clarification:\n" + 
          context.clarificationRequests.map(r => r.prompt).join('\n');
      }

      // logger.info(`Generated consolidated response: ${responseMessage}`);
      return responseMessage;
    } catch (error) {
      logger.error('Error generating consolidated response:', error);
      return "I've processed your message, but encountered some issues. Please try again.";
    }
  }
}

export const responseGeneratorService = ResponseGeneratorService.getInstance(); 