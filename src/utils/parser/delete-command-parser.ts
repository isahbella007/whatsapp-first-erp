import AppError from '../../utils/errors/AppError';

/**
 * Parse multiple product names from delete command input
 * @param input Raw command input (e.g., "delete kkk, hello \n delete ghg delete ii")
 * @returns Array of product names to delete
 */
export function parseProductsToDelete(input: string): string[] {
  if (!input.trim()) {
    throw new AppError('No product names provided. Use: delete product-name (e.g. delete zobo)', 400);
  }
  
  // First, handle multiple delete commands by normalizing to a single format
  const normalized = input
    .replace(/delete\s+/gi, 'delete ') // Normalize delete keywords
    .trim();
  
  // Split by "delete" keyword but keep the segments that follow it
  const segments = normalized.split(/\b(?=delete\s)/i)
    .filter(Boolean) // Remove empty strings
    .map(segment => segment.trim());
  
  const productNames: string[] = [];
  
  // Process each segment (which starts with "delete ")
  segments.forEach(segment => {
    // Remove the "delete" keyword if present
    const withoutKeyword = segment.replace(/^delete\s+/i, '').trim();
    if (!withoutKeyword) return;
    
    // Split by commas or newlines
    const names = withoutKeyword
      .split(/,|\n/)
      .map(name => name.trim())
      .filter(Boolean);
    
    productNames.push(...names);
  });
  
  if (productNames.length === 0) {
    throw new AppError('No product names provided. Use: delete product-name (e.g. delete zobo)', 400);
  }
  
  return productNames;
} 