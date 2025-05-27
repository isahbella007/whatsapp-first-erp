import { commandParserService } from "../../services/command-parser.service";
import { messageHandlerService } from "../../services/message-handler.service";

const testCases = [
    // let us test order of execution
    "I want to see all low stock items",
    "Show me my current stock. I also sold 3 packets of salt, 2 maggi, 8 bottles of zobo delight. I got new stock for indomie today. A carton of indomie super pack at 10k niara ",
    "I bought 1 bag of salt, there are 70 packs in a bag and each pack is 25g.\n At the same time, I am not selling one golden penny spagethi for 1500 naira. I sold 3 packs of salt for 3000 naira and I sold 3 cubes of maggi for 100 naira",
//    "Hey, I sold 2 bags of rice for ₦12,500 each. I also bought 3 cartons of Indomie today. One carton has 40 packs. And I need to update my customer, Chima: he just paid ₦5,000 for his outstanding debt."
// "I just got a new shipment! Add Fresh Farm Eggs. A crate of eggs has 12 pieces. I also want to update the price of Mama Gold Rice. A 50kg bag is now 45,000 naira. And I also bought 15 bags of cement. I'll sell a bag of cement for 1500 naira, and one carton of cement is 10 bags.",
// "Record a sale: 2 bottles of Zobo Delight, 5 packs of Indomie. Also, I sold 3 Mama Gold Rice (50kg) to Esther for a total of 130,000 naira, but she paid 100,000. She'll pay the rest next week."
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
