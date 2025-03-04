import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { SpheronSDK } from "@spheron/protocol-sdk";
import { insertDeploymentSchema } from "@shared/schema";
import dotenv from "dotenv";

/**
 * Load and validate environment configuration
 */
dotenv.config();

// Environment variables
const SPHERON_PRIVATE_KEY = process.env.SPHERON_PRIVATE_KEY;
const PROVIDER_PROXY_URL = process.env.PROVIDER_PROXY_URL || "https://provider-proxy.spheron.network";
const NETWORK = process.env.SPHERON_NETWORK || "testnet";

/**
 * Validates required environment variables are present
 * @throws {Error} If any required environment variables are missing
 */
function validateEnvironment() {
  const required = [
    { key: 'SPHERON_PRIVATE_KEY', value: SPHERON_PRIVATE_KEY },
  ];

  const missing = required
    .filter(({ value }) => !value)
    .map(({ key }) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or environment configuration.'
    );
  }
}

/**
 * Safely converts BigInt values to strings in API responses
 * @param obj - Object potentially containing BigInt values
 * @returns Object with BigInt values converted to strings
 */
function sanitizeResponse(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeResponse);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeResponse(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Registers API routes for the Spheron deployment application
 * @param app - Express application instance
 * @returns HTTP server instance
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Validate environment before starting the server
  validateEnvironment();

  // Initialize SDK with configured network
  const sdk = new SpheronSDK(NETWORK, SPHERON_PRIVATE_KEY!);

  /**
   * GET /api/balance
   * Returns the current CST balance from escrow
   */
  app.get("/api/balance", async (req, res) => {
    try {
      const balance = await sdk.escrow.getUserBalance("CST");
      res.json(sanitizeResponse(balance));
    } catch (error: any) {
      console.error('Error fetching balance:', error);
      res.status(500).json({ 
        message: "Failed to fetch balance",
        error: error.message 
      });
    }
  });

  /**
   * POST /api/deployments
   * Creates a new deployment with the provided configuration
   * Validates CST balance before proceeding
   * Returns comprehensive deployment information including transaction and lease details
   */
  app.post("/api/deployments", async (req, res) => {
    try {
      const parsed = insertDeploymentSchema.parse(req.body);

      // Check balance first
      const balance = await sdk.escrow.getUserBalance("CST");
      if (!balance || parseFloat(balance.unlockedBalance) <= 0) {
        throw new Error("Insufficient CST balance in escrow");
      }

      // Create deployment using SDK
      const deploymentTxn = await sdk.deployment.createDeployment(
        parsed.iclConfig,
        PROVIDER_PROXY_URL
      );

      // Initialize deployment details
      let deploymentDetails = null;
      let leaseDetails = null;

      if (deploymentTxn.leaseId) {
        try {
          // Get deployment details
          deploymentDetails = await sdk.deployment.getDeployment(
            deploymentTxn.leaseId,
            PROVIDER_PROXY_URL
          );

          // Get additional deployment information
          const [orderDetails, leaseInfo, leaseStatus, providerDetails, deploymentLogs] = await Promise.all([
            sdk.orders.getOrderDetails(deploymentTxn.leaseId),
            sdk.leases.getLeaseDetails(deploymentTxn.leaseId),
            sdk.leases.getLeaseStatusByLeaseId(deploymentTxn.leaseId),
            sdk.provider.getProviderDetails(leaseInfo.providerAddress),
            sdk.deployment.getDeploymentLogs(
              deploymentTxn.leaseId,
              PROVIDER_PROXY_URL,
              { tail: 100, startup: true }
            )
          ]);

          // Update lease details
          leaseDetails = leaseInfo;

          // Combine all the details
          deploymentDetails = {
            ...deploymentDetails,
            provider: leaseStatus?.provider || "",
            pricePerHour: leaseStatus?.pricePerHour?.toString() || "0",
            startTime: leaseStatus?.startTime || new Date().toISOString(),
            remainingTime: leaseStatus?.remainingTime || "",
            services: deploymentDetails?.services || {},
            orderDetails,
            providerDetails: {
              hostUri: providerDetails.hostUri,
              spec: providerDetails.spec,
              status: providerDetails.status,
              trust: providerDetails.trust
            },
            logs: deploymentLogs
          };
        } catch (error) {
          console.error("Error fetching deployment details:", error);
          // Continue with partial information if some calls fail
        }
      }

      // Store deployment info
      const stored = await storage.createDeployment(parsed);

      // Return comprehensive deployment information with sanitized values
      res.json(sanitizeResponse({
        deployment: stored,
        transaction: deploymentTxn,
        details: deploymentDetails,
        lease: leaseDetails
      }));
    } catch (error: any) {
      console.error('Error creating deployment:', error);
      res.status(400).json({ 
        message: "Failed to create deployment",
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}