import AppError from "../errors/AppError";

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
   */
  export function parseItemQuantityPrice(input: string): ItemQuantityPrice[] {
    const cleanPriceString = (raw: string): number => {
      const sanitized = raw
        .toLowerCase()
        .replace(/[#₦,]/g, '') // Remove #, ₦, commas
        .trim();
  
      // Handle 'k' shorthand (e.g. 380k = 380000)
      if (sanitized.endsWith('k')) {
        const num = parseFloat(sanitized.replace('k', ''));
        return isNaN(num) ? NaN : num * 1000;
      }
  
      const num = parseFloat(sanitized);
      return isNaN(num) ? NaN : num;
    };
  
    return input
      .split(',')
      .map(chunk => chunk.trim())
      .filter(Boolean)
      .map(chunk => {
        const parts = chunk.split(/\s+/); // split by any whitespace
        const pricePart = parts.pop();
        const quantityPart = parts.pop();
        const productName = parts.join(' ');
  
        const quantity = parseInt(quantityPart || '', 10);
        const price = cleanPriceString(pricePart || '');
  
        if (!productName || isNaN(quantity) || isNaN(price)) {
          throw new AppError(`Invalid entry: "${chunk}". Use: name qty price (e.g. zobo 10 150)`, 400);
        }
  
        return {
          product: productName.trim(),
          quantity,
          price,
        };
      });
  }
  