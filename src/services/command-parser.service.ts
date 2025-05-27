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
              productName: { type: 'string' },
              price: { type: 'number', nullable: true },
              priceUnitOfMeasure: { type: 'string', nullable: true },
              initialQuantity: { type: 'number', nullable: true },
              initialQuantityUnitOfMeasure: { type: 'string', nullable: true },
              conversionFactorProvided: {
                type: 'object',
                nullable: true,
                properties: {
                  unit1: { type: 'string' },
                  unit1Quantity: { type: 'number' },
                  unit2: { type: 'string' },
                  unit2Quantity: { type: 'number' }
                }
              },
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
   - For "add_product": 
     * Extract productName (required, e.g., "Zobo Delight", "Fanta")
     * Extract price if mentioned (e.g., "1000 naira", "25k")
     * Extract priceUnitOfMeasure if specified (e.g., "bottle", "crate", "kg"). **Focus on the base unit of measure for the price, not necessarily the full descriptive phrase for the product.** For example, "A 50kg bag is 45,000 naira" should yield 'kg' or 'bag', not '50kg bag'.
     * Extract initialQuantity if provided (e.g., "5", "10")
     * Extract initialQuantityUnitOfMeasure if specified (e.g., "crates", "cans", "ctn")
     * Extract conversionFactorProvided if mentioned (e.g., "a crate is 12 bottles")
       - unit1: first unit (e.g., "crate")
       - unit1Quantity: quantity of first unit (e.g., 1)
       - unit2: second unit (e.g., "bottle")
       - unit2Quantity: quantity of second unit (e.g., 12)
   - For "delete_product": Extract product name
   - For "update_product":
    * Extract productName (required, e.g., "Zobo Delight", "Fanta").
    * Extract **quantity** if mentioned, representing the amount to be added or changed (e.g., "add 5", "increase by 10", "I bought 5 crates"). Map this to 'initialQuantity'.
        - Also extract initialQuantityUnitOfMeasure if specified (e.g., "crates", "packs").
    * Extract **price** if mentioned, representing the new selling price (e.g., "price is 10k", "costs 500 naira per piece"). Map this to 'price'.
        - Also extract priceUnitOfMeasure if specified (e.g., "piece", "dozen", "sachet", "one", "unit"). **Prioritize recognizing words like "one", "each", "per" as indicating a single base unit.**
    * Extract **conversionFactorProvided** if mentioned (e.g., "a crate is 12 bottles", "1kg is 1000 grams"). This applies to *any* unit conversion specified, whether for stock or for price context.
        - Ensure to extract 'unit1', 'unit1Quantity', 'unit2', 'unit2Quantity' correctly.
    * This intent should activate for phrases like: "update [product]", "change [product] price", "add stock to [product]", "record purchase of [product]", "I bought [quantity] of [product]".
    * Do not set an updateType parameter. Instead, rely on the presence of initialQuantity, price, and conversionFactorProvided to indicate what needs updating. Your backend addProduct function is designed to handle this.
    
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
        input: 'I added a new product to my store, Zobo Delight. I am selling a bottle for 1000 naira',
        output: [
          {
            intent: 'add_product',
            params: { 
              productName: 'Zobo Delight',
              price: 1000,
              priceUnitOfMeasure: 'bottle',
              initialQuantity: null,
              initialQuantityUnitOfMeasure: null,
              conversionFactorProvided: null
            }
          }
        ]
      },
      {
        input: 'Add 5 crates of Fanta at 25k',
        output: [
          {
            intent: 'add_product',
            params: { 
              productName: 'Fanta',
              price: 5000,
              priceUnitOfMeasure: 'crate',
              initialQuantity: 5,
              initialQuantityUnitOfMeasure: 'crates',
              conversionFactorProvided: null
            }
          }
        ]
      },
      {
        input: 'I bought half a carton of spaghetti at 10k. Half carton is 30 packs',
        output: [
          {
            intent: 'add_product',
            params: { 
              productName: 'spaghetti',
              price: 10000,
              priceUnitOfMeasure: 'half carton',
              initialQuantity: 0.5,
              initialQuantityUnitOfMeasure: 'carton',
              conversionFactorProvided: {
                unit1: 'carton',
                unit1Quantity: 1,
                unit2: 'pack',
                unit2Quantity: 60 // NLP should derive 1 carton = 60 packs from "half carton is 30 packs"
              }
            }
          }
        ]
      },
      
      {
        input: 'update Zobo price to 1500 naira per bottle',
        output: [
          {
            intent: 'update_product',
            params: {
              productName: 'Zobo',
              price: 1500,
              priceUnitOfMeasure: 'bottle'
            }
          }
        ]
      },
      {
        input: 'For Indomie, the price per pack is 150. I also bought 5 cartons.',
        output: [
          {
            intent: 'update_product',
            params: {
              productName: 'Indomie',
              price: 150,
              priceUnitOfMeasure: 'pack',
              initialQuantity: 5,
              initialQuantityUnitOfMeasure: 'cartons'
            }
          }
        ]
      },
      {
        input: 'Change Yam price to 800.',
        output: [
          {
            intent: 'update_product',
            params: {
              productName: 'Yam',
              price: 800,
              priceUnitOfMeasure: null // LLM might not find a unit, that's okay
            }
          }
        ]
      },
      {
        input: 'Increase stock of bread by 10 loaves.',
        output: [
          {
            intent: 'update_product',
            params: {
              productName: 'bread',
              initialQuantity: 10,
              initialQuantityUnitOfMeasure: 'loaves'
            }
          }
        ]
      },
      {
        input: 'Set a dozen of eggs to 2500 naira. A dozen is 12 pieces.',
        output: [
          {
            intent: 'update_product',
            params: {
              productName: 'eggs',
              price: 2500,
              priceUnitOfMeasure: 'dozen',
              conversionFactorProvided: {
                unit1: 'dozen',
                unit1Quantity: 1,
                unit2: 'piece',
                unit2Quantity: 12
              }
            }
          }
        ]
      },
      {
        input: 'I now sell milk for 300 naira. I got 5 cartons today.',
        output: [
          {
            intent: 'update_product',
            params: {
              productName: 'milk',
              price: 300,
              priceUnitOfMeasure: null, // If user doesn't specify 'per bottle', LLM might leave it null. Your backend handles this.
              initialQuantity: 5,
              initialQuantityUnitOfMeasure: 'cartons'
            }
          }
        ]
      },
      {
        input: 'Add 15 bags of cement.',
        output: [
          {
            intent: 'update_product',
            params: {
              productName: 'cement',
              initialQuantity: 15,
              initialQuantityUnitOfMeasure: 'bags'
            }
          }
        ]
      },
      {
        input: 'The cost of Pure water is now 200 naira per sachet.',
        output: [
          {
            intent: 'update_product',
            params: {
              productName: 'Pure water',
              price: 200,
              priceUnitOfMeasure: 'sachet'
            }
          }
        ]
      },
      {
        input: 'I have 50 packs of biscuits. One carton is 10 packs.',
        output: [
          {
            intent: 'update_product',
            params: {
              productName: 'biscuits',
              initialQuantity: 50,
              initialQuantityUnitOfMeasure: 'packs',
              conversionFactorProvided: {
                unit1: 'carton',
                unit1Quantity: 1,
                unit2: 'pack',
                unit2Quantity: 10
              }
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
      const executionOrder = [
        'add_product',
        'update_product',
        'delete_product',
        'add_customer',
        'delete_customer',
        'record_sale',
        'get_customer',
        'check_stock'
      ];
    
      result.data.sort((a, b) => {
        const indexA = executionOrder.indexOf(a.intent);
        const indexB = executionOrder.indexOf(b.intent);
    
        // If an intent isn't in our defined order, treat it as lower priority (push to end)
        // Or, you could throw an error if an unknown intent is parsed.
        if (indexA === -1 && indexB === -1) return 0; // Both unknown, maintain original order
        if (indexA === -1) return 1; // 'a' is unknown, push to end
        if (indexB === -1) return -1; // 'b' is unknown, 'a' comes before 'b'
    
        return indexA - indexB; // Sort by their index in the defined order
      });
    }

    return result;
  }
}

export const commandParserService = CommandParserService.getInstance(); 