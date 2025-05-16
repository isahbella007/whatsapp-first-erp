import { commandParserService } from "../../services/command-parser.service";
import { messageHandlerService } from "../../services/message-handler.service";

const testCases = [
    "I want to see all my customers",
    "shoe me john and faith details",
    // "add beans 5 10. customer add John is flirty and likes me\ncustomer delete Grace\n add mama gold rice 100 70k naira",
    // "customer add John Doe\n customer add Jane Smith\n customer add Korne he pays late, he likes cold zobo, 09012578, customer add John, customer add Grace",
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
