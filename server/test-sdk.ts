import { SpheronSDK } from "@spheron/protocol-sdk";
import dotenv from "dotenv";

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

async function testSDKFeatures() {
  try {
    console.log("Starting SDK feature tests...\n");

    // 1. Get all lease IDs
    console.log("1. Testing getLeaseIds...");
    const { activeLeaseIds, terminatedLeaseIds, allLeaseIds } = await sdk.leases.getLeaseIds();
    console.log("Active Leases:", activeLeaseIds);
    console.log("Terminated Leases:", terminatedLeaseIds);
    console.log("All Leases:", allLeaseIds);
    console.log("\n");

    // If we have any lease IDs, test other features
    if (allLeaseIds.length > 0) {
      const testLeaseId = allLeaseIds[0];
      console.log(`Using lease ID for testing: ${testLeaseId}\n`);

      // 2. Get lease details
      console.log("2. Testing getLeaseDetails...");
      const leaseDetails = await sdk.leases.getLeaseDetails(testLeaseId);
      console.log("Lease Details:", JSON.stringify(leaseDetails, null, 2));
      console.log("\n");

      // 3. Get deployment details
      console.log("3. Testing getDeployment...");
      const deploymentDetails = await sdk.deployment.getDeployment(
        testLeaseId,
        PROVIDER_PROXY_URL
      );
      console.log("Deployment Details:", JSON.stringify(deploymentDetails, null, 2));
      console.log("\n");

      // 4. Get lease status
      console.log("4. Testing getLeaseStatusByLeaseId...");
      const leaseStatus = await sdk.leases.getLeaseStatusByLeaseId(testLeaseId);
      console.log("Lease Status:", JSON.stringify(leaseStatus, null, 2));
      console.log("\n");

      // Optional: Test closeDeployment (commented out to prevent accidental closure)
      /*
      console.log("5. Testing closeDeployment...");
      const closeResult = await sdk.deployment.closeDeployment(testLeaseId);
      console.log("Close Result:", JSON.stringify(closeResult, null, 2));
      console.log("\n");
      */
    } else {
      console.log("No leases found to test additional features.");
    }

    console.log("SDK feature tests completed successfully!");
  } catch (error) {
    console.error("Error during SDK feature testing:", error);
    throw error;
  }
}

// Run the tests
testSDKFeatures()
  .then(() => console.log("Testing completed."))
  .catch((error) => {
    console.error("Testing failed:", error);
    process.exit(1);
  });
