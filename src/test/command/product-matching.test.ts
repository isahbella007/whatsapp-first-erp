import { findSimilarProducts, getBestProductMatch } from "../../utils/productMatching";
import mongoose from "mongoose";

// Mock inventory data with only the fields we need for testing
const mockInventory = [
    {
        _id: new mongoose.Types.ObjectId("682e2076afd2ecfc0ff6fe6b"),
        user: new mongoose.Types.ObjectId("682447c1a8185e370ac224e0"),
        name: "indomie",
        price: 1000
    },
    {
        _id: new mongoose.Types.ObjectId("682e2076afd2ecfc0ff6fe6c"),
        user: new mongoose.Types.ObjectId("682447c1a8185e370ac224e0"),
        name: "carton of indomie",
        price: 10000
    },
    {
        _id: new mongoose.Types.ObjectId("682e2076afd2ecfc0ff6fe6c"),
        user: new mongoose.Types.ObjectId("682447c1a8185e370ac224e0"),
        name: "salt",
        price: 10000
    }
];

// Mock the inventory service
import newInventoryService from "../../services/newInventory.service";
(newInventoryService.getProducts as any) = async () => mockInventory;

const testCases = [
    "cartons of indomie", 
    "pack of salt"
];

async function runTests() {
    console.log("======= PRODUCT MATCHING TEST ========");
    const userId = "682447c1a8185e370ac224e0";

    // Test findSimilarProducts
    console.log("\nTesting findSimilarProducts:");
    for (let i = 0; i < testCases.length; i++) {
        const searchText = testCases[i];
        console.log(`\nTest Case ${i + 1}:`);
        console.log(`Input: "${searchText}"`);
        
        try {
            const results = await findSimilarProducts(userId, searchText);
            console.log("Results:", JSON.stringify(results, null, 2));
        } catch (error: any) {
            console.error("Error:", error.message);
        }
    }

    // Test getBestProductMatch
    console.log("\nTesting getBestProductMatch:");
    for (let i = 0; i < testCases.length; i++) {
        const searchText = testCases[i];
        console.log(`\nTest Case ${i + 1}:`);
        console.log(`Input: "${searchText}"`);
        
        try {
            const result = await getBestProductMatch(userId, searchText);
            console.log("Best Match:", JSON.stringify(result, null, 2));
        } catch (error: any) {
            console.error("Error:", error.message);
        }
    }
}

// Execute tests
runTests().catch(error => {
    console.error("Test execution failed:", error);
}); 