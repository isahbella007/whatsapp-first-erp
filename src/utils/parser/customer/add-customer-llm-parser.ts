import AppError from "../../errors/AppError";
import { getGeminiService, ParsedResponse } from "../../../services/LLM/gemini";

export interface CustomerData {
  name: string;
  phone?: string;
  tags: string[];
}

// Define the schema for the LLM to follow
const CUSTOMER_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: { type: "string", description: "Customer name" },
      phone: { type: "string", description: "Customer phone number (optional)" },
      tags: { 
        type: "array", 
        items: { type: "string" },
        description: "Array of tags/notes about the customer"
      }
    },
    required: ["name", "tags"]
  }
};

// Define prompt for the LLM
const PROMPT = `You are a highly accurate data extraction bot for a customer management system that receives input from a WhatsApp bot.
Your task is to analyze incoming messages containing customer information and extract structured data for adding new customers.

Instructions:
- Scan the entire input text to find all distinct customer entries. Each entry typically begins with the phrase "customer add". Entries might be separated by newlines or by a comma followed by "customer add".
- For each identified customer entry, extract the following pieces of information:
    - Name: The primary identifier for the customer. Identify the most likely name based on the content and context of the entry. The name can consist of multiple words and might not always be the first words after "customer add".
    - Phone Number: An optional contact number. Look for sequences of digits, potentially starting with a '+' sign. Phone numbers typically have 7 or more digits.
    - Tags: Any descriptive phrases, notes, or characteristics about the customer.

Rules:
- Extract the full name of the customer, even if it contains multiple words (e.g., "John Doe" is one name). Do NOT put parts of a name into the 'tags' field unless they are explicitly part of a descriptive tag list.
- Extract any identified phone number accurately into the 'phone' field.
- Extract descriptive phrases as separate tags into the 'tags' array. If multiple distinct descriptions are given (e.g., separated by commas), list each description as a separate item in the array. Phrases connected by "and" that form a single descriptive clause can typically remain as a single tag entry.
- If no phone number is found, the 'phone' field should be null or omitted (schema uses optional string).
- If no descriptive tags are found, the 'tags' array should be empty ( [] ).
- Your final output MUST be a valid JSON array containing one object for EACH customer entry found in the input text, strictly following the provided schema. Do NOT include any conversational text, explanations, or markdown formatting (like json), only the raw JSON array.

Note: Your final output should be an array of all parsed customers.`;

// Add examples covering various cases, including the problematic ones from before
const CUSTOMER_EXAMPLES: Array<{ input: string; output: CustomerData[] }> = [
    {
        input: "customer add John Doe",
        output: [{ name: "John Doe", tags: [] }] // Shows multi-word name
    },
    {
        input: "customer add Jane Smith phone 1234567890 tags pays-late, vip",
        output: [{ name: "Jane Smith", phone: "1234567890", tags: ["pays-late", "vip"] }] // Shows keyword-based example
    },
    {
        input: "customer add Korne he pays late, he likes cold zobo, 09012578",
        output: [{ name: "Korne", tags: ["he pays late", "he likes cold zobo"], phone: "09012578" }] // Shows tags/phone out of order, name not first after command
    },
     {
        input: "customer add Fave +2349043716432, flirts alot and is very noisy",
        output: [{ name: "Fave", phone: "+2349043716432", tags: ["flirts alot", "is very noisy"] }] // Shows phone number format, comma separated from tags, 'and' within tag
    },
     {
        input: "customer add My lovely Brother he is always generous and tips alot",
        output: [{ name: "My lovely Brother", tags: ["generous ", " tips alot" ] }] // Shows unconventional name, descriptive tag
    },
    { // Example with multiple entries
        input: "customer add Test One 11111\ncustomer add Test Two has tag",
        output: [{ name: "Test One", phone: "11111", tags: [] }, { name: "Test Two", tags: ["has tag"] }]
    },
     { // Example with multiple entries separated by comma+command
        input: "customer add Alpha Alpha, customer add Beta Beta has second tag, customer add Charlie 999",
        output: [{ name: "Alpha Alpha", tags: [] }, { name: "Beta Beta", tags: ["has second tag"] }, { name: "Charlie", phone: "999", tags: [] }]
    }
];

/**
 * Parses customer add commands using LLM
 * @param input The text containing customer add commands
 * @returns Array of parsed customer data
 */
export async function parseAddCustomerWithLLM(input: string): Promise<CustomerData[]> {
  try {
    const geminiService = getGeminiService();
    const response = await geminiService.parseCommand<CustomerData>(
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

    // Ensure all customer objects have required fields
    customers.forEach(customer => {
      if (!customer.name) {
        throw new AppError("Customer name is required", 400);
      }
      if (!Array.isArray(customer.tags)) {
        customer.tags = [];
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