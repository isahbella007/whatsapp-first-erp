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
    if (text.length > 1000) {
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
              qty: { type: 'number' },
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
              }
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

4. General Rules:
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
      }
    ];

    return await this.geminiService.parseCommand<ParsedCommand>(text, schema, prompt, examples);
  }
}

export const commandParserService = CommandParserService.getInstance(); 