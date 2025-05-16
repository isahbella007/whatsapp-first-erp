import AppError from "../../errors/AppError";
import { getGeminiService, ParsedResponse } from "../../../services/LLM/gemini";

export type CustomerData = string[];

// Define the schema for the LLM to follow
const CUSTOMER_SCHEMA = {
  type: "array",
  items: {
    type: "string",
    description: "Customer name"
  }
};

// Define prompt for the LLM
const PROMPT = `You are a highly accurate data extraction bot for a customer management system that receives input from a WhatsApp bot.
Your task is to analyze incoming messages containing customer information and extract structured data for deleting customers.

Instructions:
- Scan the entire input text to find all distinct customer entries. Each entry typically begins with the phrase "customer delete". Entries might be separated by newlines or by a comma followed by "customer delete".
- For each identified customer entry, extract the customer name.
- Do not include traits or characteristics of the customer in the output array.

Rules:
- Extract the full name of the customer, even if it contains multiple words (e.g., "John Doe" is one name).
- Your final output MUST be a valid array of strings containing EACH customer name found in the input text. Do NOT include any conversational text, explanations, or markdown formatting (like json), only the raw JSON array.

Note: Your final output should be an array of customer names.`;

// Add examples covering various cases
const CUSTOMER_EXAMPLES: Array<{ input: string; output: CustomerData }> = [
    {
        input: "customer delete kk",
        output: ["kk"]
    },
    {
        input: "customer delete kjh",
        output: ["kjh"]
    },
    {
        input: "customer delete kk, customer delete kjh",
        output: ["kk", "kjh"]
    },
    { 
        input: "customer delete kk\n lkj, sds customer delete lkjj",
        output: ["kk", "lkj", "sds", "lkjj"]
    }
];

/**
 * Parses customer delete commands using LLM
 * @param input The text containing customer delete commands
 * @returns Array of customer names
 */
export async function parseDeleteCustomerWithLLM(input: string): Promise<CustomerData> {
  try {
    const geminiService = getGeminiService();
    const response = await geminiService.parseCommand<string>(
      input,
      CUSTOMER_SCHEMA,
      PROMPT,
      CUSTOMER_EXAMPLES
    );

    if (!response.success || !response.data) {
      throw new AppError(
        response.error || "Failed to parse customer data using LLM",
        400
      );
    }

    // Validate the results
    const customers = response.data;
    if (customers.length === 0) {
      throw new AppError("No valid customer data found in the input", 400);
    }

    // Ensure all entries are strings
    customers.forEach(customer => {
      if (typeof customer !== 'string') {
        throw new AppError("All customer entries must be strings", 400);
      }
    });

    return customers;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Error parsing customer data: ${(error as Error).message}`, 400);
  }
} 