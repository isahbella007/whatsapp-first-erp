import { CommandContext } from "../../../interfaces/command.interface";
import AppError from "../../../utils/errors/AppError";
import logger from "../../../utils/logger";
import salesService from "../../sales.service";
import { BaseCommand } from "../base.command";

export interface RecordSaleParams {
  customerNames?: string[];
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
  description = 'Records a sale of one or more products to one or more customers.';
  examples = [
      'sold 5 fanta to john', 
      'I sold 2 shoes and 1 bag to Jane and Ben for 50k, they paid 30k'
    ];
  
  async execute(context: CommandContext): Promise<void> {
    try {
        if (!context.user || !context.user._id) {
            throw new AppError('A valid user context is required to record a sale.', 400);
        }

        const params = context.params as RecordSaleParams;
        
        // Delegate the core logic to the SalesService
        const response = await salesService.recordSale(context, params);

        if (!context.responses) {
            context.responses = [];
        }
        context.responses.push(response);

    } catch (error) {
        logger.error('An error occurred while executing RecordSaleCommand', { error });
        
        if (!context.responses) {
            context.responses = [];
        }

        // Provide a user-friendly error message
        context.responses.push({
            success: false,
            message: 'Sorry, I ran into a problem trying to record that sale. Please try again.'
        });
    }
  }
}

