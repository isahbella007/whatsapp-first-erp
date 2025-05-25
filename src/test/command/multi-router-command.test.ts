import { commandParserService } from "../../services/command-parser.service";
import { messageHandlerService } from "../../services/message-handler.service";

const testCases = [
   "Hey, I sold 2 bags of rice for ₦12,500 each. I also bought 3 cartons of Indomie today. One carton has 40 packs. And I need to update my customer, Chima: he just paid ₦5,000 for his outstanding debt."
]

// Run the test cases
async function runTests() {
    console.log("======= MULTI ROUTER COMMAND TEST ========")
    for(let i = 0; i < testCases.length; i++){ 
        const input = testCases[i];
        console.log(`\nTest Case ${i + 1}:`);
        console.log(`Input: "${input}"`);
        
        try {
            const result = await commandParserService.parseCommands(input);
            console.log('Output:', JSON.stringify(result, null, 2));
        } catch (error: any) {
        console.error('Error:', error.message);
        }
    }
}

// Execute tests
runTests().catch(error => {
    console.error('Test execution failed:', error);
  }); 
