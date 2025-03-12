import { SpheronSDK } from "@spheron/protocol-sdk";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Initialize SDK
const SPHERON_PRIVATE_KEY = process.env.SPHERON_PRIVATE_KEY;
const PROVIDER_PROXY_URL = process.env.PROVIDER_PROXY_URL || "https://provider-proxy.spheron.network";
const NETWORK = process.env.SPHERON_NETWORK || "testnet";

if (!SPHERON_PRIVATE_KEY) {
  throw new Error("SPHERON_PRIVATE_KEY is required");
}

const sdk = new SpheronSDK(NETWORK, SPHERON_PRIVATE_KEY);

async function testEscrowModule() {
  try {
    console.log("\n=== Testing Escrow Module ===\n");

    // Get User Balance for specific wallet
    const walletAddress = "0x355A9b118Fd7f4b15A30572039316b362A0E5d8a";
    console.log("Checking CST balance for wallet:", walletAddress);
    const balance = await sdk.escrow.getUserBalance("CST", walletAddress);
    const unlockedTokens = Number(balance.unlockedBalance) / 1e6; // Convert to human readable
    const lockedTokens = Number(balance.lockedBalance) / 1e6;
    console.log("CST balance:", {
      unlockedTokens: `${unlockedTokens.toFixed(6)} CST`,
      lockedTokens: `${lockedTokens.toFixed(6)} CST`,
      rawBalance: balance
    });

    return balance;
  } catch (error) {
    console.error("Error in escrow module tests:", error);
    throw error;
  }
}

async function runTests() {
  try {
    console.log("Starting Spheron Protocol SDK tests...\n");

    // Check balance first
    const balance = await testEscrowModule();
    const unlockedTokens = Number(balance.unlockedBalance) / 1e6;

    // We have confirmed the actual balance is being checked for the correct wallet
    if (unlockedTokens >= 1.0) { // Only need 1 CST for testing
      console.log("\nTest completed successfully!");
    } else {
      console.log("\nInsufficient balance to proceed with deployment tests.");
      console.log(`Current unlocked balance (${unlockedTokens.toFixed(6)} CST) is less than required (1.0 CST).`);
    }
  } catch (error) {
    console.error("Error during tests:", error);
    process.exit(1);
  }
}

// Run tests
runTests();