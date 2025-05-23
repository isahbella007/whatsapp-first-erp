import { getGeminiService } from './LLM/gemini';

interface ParsedCommand {
  intent: string;
  params: Record<string, any>;
}

export class CommandParserService {
  private static instance: CommandParserService;
  private readonly geminiService = getGeminiService();

  private constructor() {}

  static getInstance(): CommandParserService {
    if (!CommandParserService.instance) {
      CommandParserService.instance = new CommandParserService();
    }
    return CommandParserService.instance;
  }

  async parseCommands(text: string): Promise<{ success: boolean; data?: ParsedCommand[]; error?: string }> {
    // Check if input exceeds 1000 characters
    if (text.length > 2000) {
      return {
        success: false,
        error: 'Input exceeds maximum length of 1000 characters'
      };
    }

    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          intent: { type: 'string' },
          params: { 
            type: 'object',
            properties: {
              // Product params
              name: { type: 'string' },
              qty: { type: 'number', nullable: true },
              price: { type: 'number' },
              // Customer params
              phone: { type: 'string' },
              tags: { 
                type: 'array',
                items: { type: 'string' }
              },
              // Stock params
              query: { type: 'string' },
              category: { type: 'string' },
              type: { type: 'string' },
              // Update params
              updateType: { type: 'string', enum: ['quantity', 'price', 'both'] },
              // Customer view params
              viewType: { type: 'string', enum: ['all', 'single', 'search'] },
              searchTerm: { type: 'string' },
              searchNames: { 
                type: 'array',
                items: { type: 'string' }
                
              },

              // --- Sale specific params ---
              customerName: { type: 'string', nullable: true }, // Customer name extracted from sale message
                items: { // Array of items in this sale event
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                  productName: { type: 'string' },
                  quantity: { type: 'number' },
                  pricePerUnit: { type: 'number', nullable: true }, // Price per unit derived from text (e.g., 900, 9000)
                  // Optional: Include the raw price phrase if needed for parsing logic later
                  // pricePhrase: { type: 'string', nullable: true }
                  },
                  required: ['productName', 'quantity'] // Each item needs at least name and qty
                },
                  nullable: true // The 'items' array might not be present for non-sale intents
                },
                  totalValue: { type: 'number', nullable: true }, // E.g., 70000
                  amountPaid: { type: 'number', nullable: true }, // E.g., 25000
                  notes: { type: 'string', nullable: true }, // E.g., "She has not completed the money"
                  status: { type: 'string', enum: ['complete', 'incomplete'], nullable: true }
              
            }
          }
        },
        required: ['intent', 'params']
      }
    };

    const prompt = `You are a highly accurate command parser for a WhatsApp business management system.
Your task is to analyze incoming messages and extract structured commands with their parameters.

For each command, follow these rules:

1. Product Commands:
   - For "add_product": Extract name, quantity, and price
   - For "delete_product": Extract product name
   - For "update_product": 
     * Extract product name
     * If "update [product] [qty]", set qty and updateType="quantity"
     * If "update [product] price [price]", set price and updateType="price"
     * If "update [product] [qty] [price]", set both and updateType="both"
     * If "update [product] qty [qty]", set qty and updateType="quantity"

2. Customer Commands:
   - For "add_customer": 
     * Extract full name (can be multiple words)
     * Extract phone number if present (7+ digits, may start with +)
     * Extract descriptive tags/notes as array items
     * Split tags on commas or "and" if they form distinct descriptions
   - For "delete_customer": Extract customer name
   - For "get_customer":
     * If just "customers" or "view customers", set viewType="all"
     * If "customer [name]" or "view customer [name]", set viewType="single" and name
     * If searching for multiple names:
       - Split names on "and", "&", or commas
       - Remove words like "details", "info", "show", "me", etc.
       - Set viewType="search" and searchNames array with individual names
       - Example: "show me john and faith details" -> searchNames=["john", "faith"]
       - Example: "find ben, carter & grace" -> searchNames=["ben", "carter", "grace"]

3. Stock Commands:
   - For "check_stock":
     * If just "stock", return empty params
     * If "stock [product]", set query to product name
     * If "stock category [category]", set category
     * If "stock low", set type to "low"
   - Stock commands should be processed after modification commands
   - Stock commands can be combined with other commands in the same message
   

4. Sale Commands:
    - For "record_sale":
      * Identify individual items sold within the sale event. Each item needs a productName and quantity.
      * Extract quantity (numbers like 5, 4) and the associated productName (words near the quantity). Handle plurals.
      * Extract any price mentioned for an item (e.g., "at 9k", "for 900 naira"). Convert price to a number. Assign it to pricePerUnit. Note that the price might be per unit even if not explicitly stated "each". Use context to infer if 8k is per unit or total for the items it follows. **Prioritize per-unit if unclear, or extract the phrase if complex.** Let's assume for now you want the LLM to give the number price, but you'll handle the 'each vs total' ambiguity in your backend *after* parsing.
      * If a customer is mentioned (near "to", "for", "for customer"), extract their name and assign to customerName.
      * If a total sale value is mentioned (e.g., "for 70 thousand naira"), extract the number and assign to totalValue.
      * If an amount paid is mentioned (e.g., "paid me 25000 naira"), extract the number and assign to amountPaid.
      * Extract any trailing notes about payment status or conditions and assign to notes.
      * A single message might contain multiple separate sale events. Parse each as a distinct "sale" object in the output array.
      * If a sale is incomplete, set status to "incomplete". If a sale is complete, set status to "complete".
      * If the total amount and the amount paid are not the same, set status to "incomplete".
      
5. General Rules:
   - Commands may be separated by newlines, periods, or commas
   - Each command should be a separate object in the output array
   - Include only the relevant parameters for each command type
   - For customer tags, split on commas or "and" if they form distinct descriptions
   - Phone numbers should be extracted as is, including any + prefix
   - Names can be multiple words and should be kept together
   - Process stock commands after modification commands

Your output must be a valid JSON array of command objects, each with an intent and appropriate parameters.`;

    const examples = [
      {
        input: 'add beans 5 10. customer add John Doe +2349012345678 is flirty and likes cold drinks, customer delete Grace',
        output: [
          {
            intent: 'add_product',
            params: { name: 'beans', qty: 5, price: 10 }
          },
          {
            intent: 'add_customer',
            params: { 
              name: 'John Doe',
              phone: '+2349012345678',
              tags: ['is flirty', 'likes cold drinks']
            }
          },
          {
            intent: 'delete_customer',
            params: { name: 'Grace' }
          }
        ]
      },
      {
        input: 'update zobo 15 1500',
        output: [
          {
            intent: 'update_product',
            params: { 
              name: 'zobo',
              qty: 15,
              price: 1500,
              updateType: 'both'
            }
          }
        ]
      },
      {
        input: 'update zobo price 1500',
        output: [
          {
            intent: 'update_product',
            params: { 
              name: 'zobo',
              price: 1500,
              updateType: 'price'
            }
          }
        ]
      },
      {
        input: 'update zobo 15',
        output: [
          {
            intent: 'update_product',
            params: { 
              name: 'zobo',
              qty: 15,
              updateType: 'quantity'
            }
          }
        ]
      },
      {
        input: 'update zobo qty 15',
        output: [
          {
            intent: 'update_product',
            params: { 
              name: 'zobo',
              qty: 15,
              updateType: 'quantity'
            }
          }
        ]
      },
      {
        input: 'customers',
        output: [
          {
            intent: 'get_customer',
            params: { 
              viewType: 'all'
            }
          }
        ]
      },
      {
        input: 'view customer John Doe',
        output: [
          {
            intent: 'get_customer',
            params: { 
              viewType: 'single',
              name: 'John Doe'
            }
          }
        ]
      },
      {
        input: 'search customer John',
        output: [
          {
            intent: 'get_customer',
            params: { 
              viewType: 'search',
              searchTerm: 'John'
            }
          }
        ]
      },
      {
        input: 'show me john and faith details',
        output: [
          {
            intent: 'get_customer',
            params: { 
              viewType: 'search',
              searchNames: ['john', 'faith']
            }
          }
        ]
      },
      {
        input: 'find ben, carter & grace',
        output: [
          {
            intent: 'get_customer',
            params: { 
              viewType: 'search',
              searchNames: ['ben', 'carter', 'grace']
            }
          }
        ]
      },
      {
        input: 'I sold 5 red shoes today at 9k, ref bags at 9k, 4 bottles of zobo at 900 naira\n oh, I equally sold 5 shoes to agnes for 70 thousand naira but she paid me 25000 naira. She has not completed the money',
        output: [
          {
            "intent": "record_sale",
            "params": {
              "items": [
                {
                  "productName": "red shoes",
                  "quantity": 5,
                  "pricePerUnit": 9000 // LLM interprets "9k" as 9000
                },
                {
                  "productName": "ref bags",
                  "quantity": null, // Quantity is missing for ref bags in the input
                  "pricePerUnit": 9000 // LLM interprets "9k" here too
                },
                {
                  "productName": "bottles of zobo",
                  "quantity": 4,
                  "pricePerUnit": 900 // LLM interprets "900 naira"
                }
              ],
              "status": "complete"
              // customerName, totalValue, amountPaid, notes would be null/undefined for this sale object
            }
          },
          {
            "intent": "record_sale",
            "params": {
              "customerName": "agnes",
              "items": [
                {
                  "productName": "shoes",
                  "quantity": 5,
                  "pricePerUnit": null // LLM calculates 70k / 5 = 14k per shoe OR sets totalValue and pricePerUnit as null
                  // Or if the LLM doesn't calculate per-unit, it might return:
                  // "pricePerUnit": null // You'd need to handle this in your backend logic using totalValue
                }
              ],
              "totalValue": 70000, // LLM converts "70 thousand naira"
              "amountPaid": 25000, // LLM converts "25000 naira"
              "notes": "she has not completed the money",
              "status": "incomplete"
            }
          }
        ]
      }
    ];

    // return await this.geminiService.parseCommand<ParsedCommand>(text, schema, prompt, examples);
    const result = await this.geminiService.parseCommand<ParsedCommand>(text, schema, prompt, examples);
    
    if (result.success && result.data) {
      // Sort commands to ensure record_sale is always last
      result.data.sort((a, b) => {
        if (a.intent === 'record_sale') return 1;
        if (b.intent === 'record_sale') return -1;
        return 0;
      });
    }

    return result;
  }
}

export const commandParserService = CommandParserService.getInstance(); 