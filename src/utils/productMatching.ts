import { getGeminiService } from '../services/LLM/gemini';
import inventoryService from '../services/inventory.service';
import { IInventory, IInventoryV2 } from '../interfaces/inventory.interface';
import logger from './logger';
import newInventoryService from '../services/newInventory.service';

interface ProductMatch {
  product: IInventoryV2;
  confidence: number;
  matchedTerm: string;
}

interface LLMMatchResponse {
  matches: Array<{
    productName: string;
    confidence: number;
    matchedTerm: string;
  }>;
}

/**
 * Find similar products in user's inventory based on input text
 * @param userId Business owner's user ID
 * @param searchText User's input text to match against products
 * @returns Array of matched products with confidence levels
 */
export async function findSimilarProducts(
  userId: string,
  searchText: string
): Promise<ProductMatch[]> {
  try {
    // Get all products for the user
    const allProducts = await newInventoryService.getProducts(userId);

    logger.info(`Searching for matches for "${searchText}" in ${allProducts.length} products`);
    if (allProducts.length === 0) {
      return [];
    }

    // Simplified prompt focused on exact and fuzzy matching
    const prompt = `You are a product matching assistant. Your task is to find products that match or are similar to the user's search term.

Given a list of available product names and a user's search term, return a list of matching products with a confidence score (0-1) for each.

**Matching Rules:**
1. Exact matches should have confidence 1.0
2. Close matches (minor typos, word order changes) should have confidence 0.8-0.9
3. Partial matches should have confidence 0.5-0.7
4. Only return matches with confidence > 0.3
5. Sort results by confidence (highest first)

**Output Format:**
A JSON object with a 'matches' array, where each object has:
* \`productName\`: The full name of the matched product
* \`confidence\`: A number between 0 and 1
* \`matchedTerm\`: The original search term

Example:`;

    const schema = {
      type: 'object',
      properties: {
        productName: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        matchedTerm: { type: 'string' }
      },
      required: ['productName', 'confidence', 'matchedTerm']
    };

    // Simplified examples focused on common matching scenarios
    const examples = [
      // Exact match
      {
        input: '{"products": ["Zobo Delight", "Fresh Orange Juice"], "search": "zobo delight"}',
        output: {
          productName: 'Zobo Delight',
          confidence: 1.0,
          matchedTerm: 'zobo delight'
        }
      },
      // Close match with typo
      {
        input: '{"products": ["Zobo Delight", "Fresh Orange Juice"], "search": "zobo delite"}',
        output: {
          productName: 'Zobo Delight',
          confidence: 0.9,
          matchedTerm: 'zobo delite'
        }
      },
      // Partial match
      {
        input: '{"products": ["Zobo Delight", "Fresh Orange Juice"], "search": "zobo"}',
        output: {
          productName: 'Zobo Delight',
          confidence: 0.7,
          matchedTerm: 'zobo'
        }
      }
    ];

    // Get product names for matching
    const productNames = allProducts.map(p => p.name);
    logger.info(`Available products: ${JSON.stringify(productNames)}`);

    // Use LLM to find matches
    const result = await getGeminiService().parseCommand<{
      productName: string;
      confidence: number;
      matchedTerm: string;
    }>(
      JSON.stringify({ products: productNames, search: searchText }),
      schema,
      prompt,
      examples
    );

    logger.info(`Result: ${JSON.stringify(result)}`);
    if (!result.success) {
      logger.error(`LLM parsing failed for search: "${searchText}"`, result.error);
      return [];
    }

    if (!result.data || result.data.length === 0) {
      logger.warn(`LLM returned no successful matches for search: "${searchText}"`);
      return [];
    }

    // Map the LLM result to a ProductMatch
    const match = result.data[0];
    const product = allProducts.find(p => p.name.toLowerCase() === match.productName.toLowerCase());
    
    if (!product) {
      logger.warn(`LLM matched product "${match.productName}" not found in inventory.`);
      return [];
    }

    const matches: ProductMatch[] = [{
      product,
      confidence: match.confidence,
      matchedTerm: match.matchedTerm
    }];

    logger.info(`Found ${matches.length} matches for "${searchText}"`);
    return matches;
  } catch (error) {
    logger.error('Error in findSimilarProducts:', error);
    return [];
  }
}

/**
 * Get the best matching product from user's inventory
 * @param userId Business owner's user ID
 * @param searchText User's input text to match against products
 * @returns The best matching product with confidence level, or null if no good matches
 */
export async function getBestProductMatch(
  userId: string,
  searchText: string
): Promise<{ product: IInventoryV2; confidence: number } | null> {
  const matches = await findSimilarProducts(userId, searchText);

  logger.info(`Best match search for "${searchText}": ${JSON.stringify(matches)}`);
  if (matches.length === 0) {
    return null;
  }

  // Return the highest confidence match
  const bestMatch = matches[0];

  // Only return if confidence is high enough
  if (bestMatch.confidence < 0.5) {
    logger.info(`Best match for "${searchText}" (${bestMatch.product.name}) has confidence ${bestMatch.confidence}, which is below 0.5 threshold. Returning null.`);
    return null;
  }

  return {
    product: bestMatch.product,
    confidence: bestMatch.confidence
  };
}