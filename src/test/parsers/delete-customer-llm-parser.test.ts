import { parseDeleteCustomerWithLLM } from "../../utils/parser/customer/delete-customer-parser";


// Test inputs (same as in the regex-based test)
const testInputs = [
  "customer delete kk\n customer delete jhg, sdsd\n swert customer delete kk",
  "customer delete John Doe\n customer delete Jane Smith\n customer delete Korne he pays late, he likes cold zobo, 09012578, customer delete John, customer delete Grace",
];

// Run tests
async function runTests() {
  console.log('======= LLM CUSTOMER PARSER TEST =======');
  
  for (let i = 0; i < testInputs.length; i++) {
    const input = testInputs[i];
    console.log(`\nTest Case ${i + 1}:`);
    console.log(`Input: "${input}"`);
    
    try {
      const result = await parseDeleteCustomerWithLLM(input);
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