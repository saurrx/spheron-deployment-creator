import { SpheronSDK } from "@spheron/protocol-sdk";
import * as dotenv from "dotenv";

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

    // 1. Get User Balance
    console.log("1. Testing getUserBalance...");
    const balance = await sdk.escrow.getUserBalance("CST");
    const unlockedTokens = Number(balance.unlockedBalance) / 1e6; // Convert to human readable
    const lockedTokens = Number(balance.lockedBalance) / 1e6;
    console.log("Initial CST balance:", {
      unlockedTokens: `${unlockedTokens} CST`,
      lockedTokens: `${lockedTokens} CST`,
      rawBalance: balance
    });

    return balance;
  } catch (error) {
    console.error("Error in escrow module tests:", error);
    throw error;
  }
}

// Sample ICL YAML for testing deployments with lower cost
const testIclYaml = `
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
  name: basic-web
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
    eastcoast:
      attributes:
        region: us-east
      pricing:
        web-app:
          token: CST
          amount: 1
deployment:
  web-app:
    eastcoast:
      profile: basic-web
      count: 1
`;

async function testDeploymentModule() {
  try {
    console.log("\n=== Testing Deployment Module ===\n");

    // 1. Create Deployment
    console.log("1. Testing createDeployment...");
    const deploymentResult = await sdk.deployment.createDeployment(testIclYaml, PROVIDER_PROXY_URL);
    console.log("Deployment created:", deploymentResult);
    const leaseId = deploymentResult.leaseId;

    // 2. Get Deployment Details
    console.log("\n2. Testing getDeployment...");
    const deploymentDetails = await sdk.deployment.getDeployment(leaseId, PROVIDER_PROXY_URL);
    console.log("Deployment details:", deploymentDetails);

    // 3. Update Deployment
    console.log("\n3. Testing updateDeployment...");
    const updatedIclYaml = testIclYaml.replace("512Mi", "1Gi"); // Increase memory
    const updateResult = await sdk.deployment.updateDeployment(leaseId, updatedIclYaml, PROVIDER_PROXY_URL);
    console.log("Update result:", updateResult);

    return leaseId;
  } catch (error) {
    console.error("Error in deployment module tests:", error);
    throw error;
  }
}

async function testLeaseModule(leaseId: string) {
  try {
    console.log("\n=== Testing Lease Module ===\n");

    // 1. Get Lease Details
    console.log("1. Testing getLeaseDetails...");
    const leaseDetails = await sdk.leases.getLeaseDetails(leaseId);
    console.log("Lease details:", leaseDetails);

    // 2. Get All Lease IDs
    console.log("\n2. Testing getLeaseIds...");
    const leaseIds = await sdk.leases.getLeaseIds();
    console.log("Lease IDs:", leaseIds);

    // 3. Get Leases by State
    console.log("\n3. Testing getLeasesByState...");
    const leases = await sdk.leases.getLeasesByState(undefined, {
      state: "ACTIVE",
      page: 1,
      pageSize: 10,
    });
    console.log("Active leases:", leases);

    return leaseId;
  } catch (error) {
    console.error("Error in lease module tests:", error);
    throw error;
  }
}

async function runAllTests() {
  try {
    console.log("Starting comprehensive SDK tests...\n");

    // Test escrow module first
    const balance = await testEscrowModule();
    const unlockedTokens = Number(balance.unlockedBalance) / 1e6;

    // Only proceed with deployment tests if we have sufficient balance
    if (unlockedTokens >= 1.0) { // We need at least 1 CST for our test deployment
      // Test deployment module to get a lease ID
      const leaseId = await testDeploymentModule();

      // Test lease module with the created lease
      await testLeaseModule(leaseId);

      // Clean up: Close the deployment
      console.log("\n=== Cleaning Up ===\n");
      console.log("Closing deployment...");
      const closeResult = await sdk.deployment.closeDeployment(leaseId);
      console.log("Deployment closed:", closeResult);
    } else {
      console.log("\nInsufficient balance to proceed with deployment tests.");
      console.log(`Current balance (${unlockedTokens} CST) is less than required (1.0 CST).`);
    }

    console.log("\nAll tests completed!");
  } catch (error) {
    console.error("Error during tests:", error);
    process.exit(1);
  }
}

// Run all tests
runAllTests();