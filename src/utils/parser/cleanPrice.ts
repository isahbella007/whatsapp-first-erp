/**
 * Cleans and normalizes price strings
 */
export function cleanPriceString(raw: string): number {
    if (!raw) return NaN;
    
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
  }