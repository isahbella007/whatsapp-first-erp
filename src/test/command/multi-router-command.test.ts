import { commandParserService } from "../../services/command-parser.service";
import { messageHandlerService } from "../../services/message-handler.service";

const testCases = [
    "I sold 5 red shoes for a total of 9k",
    "I sold 3 black shoes for 10k"
    // "I want to see all my customers",
    // "shoe me john and faith details",
    // "Just sold 2 cartons of milk at ₦1500 each, 5 loaves of bread for ₦800, and 1 bag of sugar.\nAlso, sold 3 coke to Emeka. Please update zobo 10.",
    // "I sold 5 red shoes today at 9k, ref bags at 9k, 4 bottles of zobo at 900 naira\n oh, I equally sold 5 shoes to agnes for 70 thousand naira but she paid me 25000 naira. She has not completed the money",      
    // "Add 5 apples for 800 naira each. I Sold 10 crates of eggs @ 2000 per crate, 3 kg of rice, and 5 sachets of tomato paste.\nThen, I sold 2 bags of cement and 4 iron rods to Mr. Eze for a total of 120k. He transferred 120k.\n Add john as a customer. He is friendly and likes to buy cos he likes my sister"
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
