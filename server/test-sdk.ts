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

    // Check balance first
    console.log("Checking CST balance...");
    const balance = await sdk.escrow.getUserBalance("CST");
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

async function testDeploymentModule() {
  try {
    console.log("\n=== Testing Deployment Module ===\n");

    // 1. Create Deployment
    console.log("1. Creating deployment using modified configuration...");

    // Create a lower-cost deployment configuration
    const testConfig = `
version: "1.0"

services:
  web-app:
    image: nginx:latest
    expose:
      - port: 80
        as: 80
        to:
          - global: true
profiles:
  name: test-web
  duration: 1h
  mode: provider
  tier:
    - community
  compute:
    web-app:
      resources:
        cpu:
          units: 1
        memory:
          size: 512Mi
        storage:
          - size: 1Gi
  placement:
    westcoast:
      attributes:
        region: us-west
      pricing:
        web-app:
          token: CST
          amount: 1
deployment:
  web-app:
    westcoast:
      profile: test-web
      count: 1
`;

    console.log("Using ICL configuration:", testConfig);

    const deploymentResult = await sdk.deployment.createDeployment(testConfig, PROVIDER_PROXY_URL);
    console.log("Deployment created:", {
      leaseId: deploymentResult.leaseId,
      transactionHash: deploymentResult.transaction.hash,
      status: deploymentResult.transaction.status === 1 ? "Success" : "Failed"
    });

    // 2. Get Deployment Details
    console.log("\n2. Fetching deployment details...");
    const deploymentDetails = await sdk.deployment.getDeployment(
      deploymentResult.leaseId,
      PROVIDER_PROXY_URL
    );
    console.log("Deployment details:", JSON.stringify(deploymentDetails, null, 2));

    return deploymentResult.leaseId;
  } catch (error) {
    console.error("Error in deployment module tests:", error);
    throw error;
  }
}

async function runTests() {
  try {
    console.log("Starting Spheron Protocol SDK tests...\n");

    // Check balance first
    const balance = await testEscrowModule();
    const unlockedTokens = Number(balance.unlockedBalance) / 1e6;

    // We have confirmed the actual balance: unlocked: ~1.57 CST
    if (unlockedTokens >= 1.0) { // Only need 1 CST for testing
      // Create deployment and get details
      const leaseId = await testDeploymentModule();
      console.log("\nTest completed successfully!");
      console.log("Lease ID for reference:", leaseId);
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