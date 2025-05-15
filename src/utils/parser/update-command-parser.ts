import { cleanPriceString } from './cleanPrice';

interface UpdateIntent {
    product: string;
    quantity?: number;
    price?: number;
  }
  
  export function parseUpdateInput(input: string): UpdateIntent[] {
    // Handle the "update" prefix if present
    let content = input;
    if (content.toLowerCase().startsWith('update ')) {
      content = content.substring(7);
    }
    
    // Split by commas and newlines to handle multiple updates
    const updateSegments = content
      .split(/,|\n/)
      .map(segment => segment.trim())
      .filter(segment => segment.length > 0)
      .map(segment => {
        // Add back "update" prefix if it was removed and now missing
        if (!segment.toLowerCase().startsWith('update ')) {
          segment = 'update ' + segment;
        }
        return segment;
      });
    
    // Process each update segment
    return updateSegments.map(segment => parseUpdateSegment(segment));
  }
  
  function parseUpdateSegment(segment: string): UpdateIntent {
    // Remove "update" prefix
    const content = segment.replace(/^update\s+/i, '').trim();
    const parts = content.split(/\s+/);
    
    // Initialize variables
    let productParts: string[] = [];
    let quantity: number | undefined;
    let price: number | undefined;
    let collectingProduct = true;
    
    // Scan through parts to find qty and price markers
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].toLowerCase();
      
      if (part === 'qty' || part === 'quantity') {
        collectingProduct = false;
        if (i + 1 < parts.length) {
          const qtyValue = parseInt(parts[i + 1], 10);
          if (!isNaN(qtyValue)) {
            quantity = qtyValue;
            i++; // Skip the value
          }
        }
      } else if (part === 'price') {
        collectingProduct = false;
        if (i + 1 < parts.length) {
          const priceValue = cleanPriceString(parts[i + 1]);
          if (!isNaN(priceValue)) {
            price = priceValue;
            i++; // Skip the value
          }
        }
      } else if (collectingProduct) {
        productParts.push(parts[i]);
      } else {
        // If we encountered a part after qty/price that isn't a recognized marker
        // Try to interpret it as an implicit quantity or price
        const numValue = parseInt(part, 10);
        if (!isNaN(numValue)) {
          if (quantity === undefined) {
            quantity = numValue;
          } else if (price === undefined) {
            price = cleanPriceString(part);
          }
        } else {
          const priceValue = cleanPriceString(part);
          if (!isNaN(priceValue) && price === undefined) {
            price = priceValue;
          }
        }
      }
    }
    
    // If no explicit qty/price markers were found, try to infer from the last 1-2 parts
    if (productParts.length >= 2 && quantity === undefined && price === undefined) {
      const lastTwo = productParts.splice(-2);
      
      // Try to parse the last part as price and second-to-last as quantity
      const lastAsPrice = cleanPriceString(lastTwo[1]);
      const secondLastAsQty = parseInt(lastTwo[0], 10);
      
      if (!isNaN(secondLastAsQty) && !isNaN(lastAsPrice)) {
        // Both are valid numbers, use them as qty and price
        quantity = secondLastAsQty;
        price = lastAsPrice;
      } else if (!isNaN(secondLastAsQty)) {
        // Only second-to-last is a valid number, use as quantity
        quantity = secondLastAsQty;
        productParts.push(lastTwo[1]); // Add last part back to product name
      } else if (!isNaN(lastAsPrice)) {
        // Only last is a valid number, try to use as price
        price = lastAsPrice;
        productParts.push(lastTwo[0]); // Add second-to-last back to product name
      } else {
        // Neither is a valid number, add both back to product name
        productParts.push(...lastTwo);
      }
    } else if (productParts.length >= 1 && quantity === undefined && price === undefined) {
      // Try interpreting the last part as a quantity
      const lastPart = productParts.pop();
      if (lastPart) {
        const lastAsQty = parseInt(lastPart, 10);
        if (!isNaN(lastAsQty)) {
          quantity = lastAsQty;
        } else {
          productParts.push(lastPart); // Add it back if not a valid quantity
        }
      }
    }
    
    return {
      product: productParts.join(' ').trim(),
      quantity,
      price
    };
  }
  
  function parsePrice(val: string): number {
    return parseFloat(val.replace(/[#₦,]/g, '').toLowerCase().replace(/k$/, '000'));
  }
  