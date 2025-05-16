import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';
import config from '../../config';

// Define the interface for parser response
export interface ParsedResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Configure the Gemini API client
class GeminiService {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  private modelName: string = 'gemini-2.0-flash'; // Using 1.5-pro for now, can be updated to 2.0 when available

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.1, // Low temperature for more deterministic results
        maxOutputTokens: 1024,
      },
    });
  }

  /**
   * Parse a command using Gemini LLM
   * @param text The text to parse
   * @param schema The expected schema of the output data
   * @param examples Optional examples to provide context to the model
   * @returns Parsed data in the expected schema format
   */
  async parseCommand<T>(
    text: string, 
    schema: object,
    prompt: string,
    examples?: Array<{input: string, output: T | T[]}>
  ): Promise<ParsedResponse<T[]>> {
    try {
      // Build the system prompt with schema and examples
      let systemPrompt = `${prompt}\n\nParse the following command according to this JSON schema: ${JSON.stringify(schema, null, 2)}`;
      
      if (examples && examples.length > 0) {
        systemPrompt += '\n\nHere are some examples:\n';
        examples.forEach((example, i) => {
          systemPrompt += `\nExample ${i + 1}:\nInput: "${example.input}"\nOutput: ${JSON.stringify(example.output, null, 2)}\n`;
        });
      }

      systemPrompt += '\n\nThe response MUST be a valid JSON array that follows the schema. Do not include any explanations, just the JSON data.';

      // Call the Gemini API
      const result = await this.model.generateContent([
        systemPrompt,
        `Parse this command: "${text}"`
      ]);

      const response = result.response;
      const textContent = response.text();

      // Extract JSON from the response (in case the model adds other text)
      const jsonMatch = textContent.match(/(\[.*\])/s);
      if (!jsonMatch) {
        return {
          success: false,
          error: 'Failed to extract JSON response from LLM',
        };
      }

      // Parse the JSON response
      const parsedData = JSON.parse(jsonMatch[0]) as T[];

      return {
        success: true,
        data: parsedData,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `LLM parsing error: ${error.message}`,
      };
    }
  }
}

// Create a singleton instance with environment variable
let instance: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!instance) {
    const apiKey = config.gemini.apiKey;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    instance = new GeminiService(apiKey);
  }
  return instance;
}
