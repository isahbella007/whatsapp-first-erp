import AppError from "../errors/AppError";
import { cleanPriceString } from "./cleanPrice";

export interface ItemQuantityPrice {
    product: string;
    quantity: number;
    price: number;
  }
  
  /**
   * Parses messages like:
   *   - "add zobo 10 150"
   *   - "add malt 20 ₦250"
   *   - "add iphone 13 pro max 15 380k"
   *   - "add samsung ultra 10 #900,000"
   *   - "add zobo 10 1k\nadd rice 5 100k"
   */
  export function parseItemQuantityPrice(input: string): ItemQuantityPrice[] {
    return input
      // Split by commas or newlines
      .split(/,|\n/)
      .map(chunk => chunk.trim())
      .filter(Boolean)
      .map(chunk => {
        // Remove the 'add' prefix if present
        const withoutPrefix = chunk.replace(/^add\s+/i, '');
        
        const parts = withoutPrefix.split(/\s+/); // split by any whitespace
        if (parts.length < 3) {
          throw new AppError(`Invalid entry: "${chunk}". Use: add name qty price (e.g. add zobo 10 150)`, 400);
        }
        
        const pricePart = parts.pop();
        const quantityPart = parts.pop();
        const productName = parts.join(' ');
  
        const quantity = parseInt(quantityPart || '', 10);
        const price = cleanPriceString(pricePart || '');
  
        if (!productName || isNaN(quantity) || isNaN(price)) {
          throw new AppError(`Invalid entry: "${chunk}". Use: add name qty price (e.g. add zobo 10 150)`, 400);
        }
  
        return {
          product: productName.trim(),
          quantity,
          price,
        };
      });
  }
  