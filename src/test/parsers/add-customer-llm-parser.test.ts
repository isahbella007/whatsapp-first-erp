import { parseAddCustomerWithLLM } from "../../utils/parser/customer/add-customer-llm-parser";


// Test inputs (same as in the regex-based test)
const testInputs = [
  "customer add Dr. Anya Sharma 987-654-3210, prefers email and is overly friendly\n customer add Mr. Ben Carter has a loyalty card, calls often, customer add Christine Lee phone +15551234567\n John Doe, 08123456789, he pays late, he likes cold zobo, 09012578, customer add John, customer add Grace",
  "customer add John Doe\n customer add Jane Smith\n customer add Korne he pays late, he likes cold zobo, 09012578, customer add John, customer add Grace",
];

// Run tests
async function runTests() {
  console.log('======= LLM CUSTOMER PARSER TEST =======');
  
  for (let i = 0; i < testInputs.length; i++) {
    const input = testInputs[i];
    console.log(`\nTest Case ${i + 1}:`);
    console.log(`Input: "${input}"`);
    
    try {
      const result = await parseAddCustomerWithLLM(input);
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