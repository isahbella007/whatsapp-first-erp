import { CommandContext } from "../../../interfaces/command.interface";
import AppError from "../../../utils/errors/AppError";
import logger from "../../../utils/logger";
import salesService from "../../sales.service";
import { BaseCommand } from "../base.command";

export interface RecordSaleParams {
  customerName: string;
  items: {
    productName: string;
    quantity: number | null;
    pricePerUnit: number | null;
  }[];
  totalValue?: number;
  amountPaid?: number;
  notes?: string;
  status?: string;
}

export class RecordSaleCommand extends BaseCommand {
  name = 'record_sale';
  description = 'Record a sale';
  examples = ['record_sale'];
  
  async execute(context: CommandContext): Promise<void> {
    try {
        logger.info(`Executing record sale command`);
        // get the params and the userId from the context 
        const params = context.params as RecordSaleParams;
        logger.info(`Params: ${JSON.stringify(params)}`);
        
        if(!params || !params.items){ 
            throw new AppError('There is no item to record', 400);
        }

        // check for the user id 
        if(!context.user || !context.user._id){ 
            throw new Error('User ID is missing');
        }

        // const result = await salesService.recordSale(params, context.user._id.toString());
        // logger.info(`Sale recording result: ${JSON.stringify(result)}`);

        // // Send appropriate response based on the result
        // if (result.success) {
        //     // Format success message
        //     let responseMessage = result.message;

        //     // If there are incomplete actions, add a follow-up message
        //     if (result.incompleteActions && result.incompleteActions.length > 0) {
        //         responseMessage += "\n\nWould you like to provide the missing information for the remaining items?";
        //     }

        //     await this.sendResponse(context.phone, responseMessage);
        // } else {
        //     // Format error message for failed sale
        //     let errorMessage = "I couldn't record the sale because:\n";
            
        //     if (result.incompleteActions) {
        //         result.incompleteActions.forEach(action => {
        //             errorMessage += `- ${action.productName}: ${action.reason}\n`;
        //         });

        //         // Add helpful suggestions for price-related issues
        //         const priceIssues = result.incompleteActions.filter(a => 
        //             a.reason.includes("Price not provided") || 
        //             a.reason.includes("Invalid price")
        //         );
                
        //         if (priceIssues.length > 0) {
        //             errorMessage += "\nTo fix this, please provide prices for these items. For example:\n";
        //             errorMessage += priceIssues.map(item => 
        //                 `"${item.productName} was [price] per unit"`
        //             ).join(" and ");
        //         }
        //     } else {
        //         errorMessage = result.message;
        //     }

        //     await this.sendResponse(context.phone, errorMessage);
        // }

    } catch (error) {
        logger.error(`Error in record sale command: ${error}`);
        
        // Handle different types of errors
        let errorMessage = "There was an error processing your request. ";
        
        if (error instanceof AppError) {
            errorMessage = error.message;
        } else if (error instanceof Error) {
            errorMessage += error.message;
        } else {
            errorMessage += "Please try again later.";
        }

        await this.sendResponse(context.phone, errorMessage);
    }
  }
}

