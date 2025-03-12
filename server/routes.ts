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
const WALLET_ADDRESS = "0x355A9b118Fd7f4b15A30572039316b362A0E5d8a";
const WALLET_PRIVATE_KEY = "bbaeebbdf3c4785e8720b22611dc3a4b2566aba0c2425fd94ffcf01319d0ea3f";

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
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Validate environment before starting the server
  validateEnvironment();

  // Initialize SDK with configured network and wallet
  const sdk = new SpheronSDK(NETWORK, WALLET_PRIVATE_KEY);

  /**
   * GET /api/balance
   * Returns the current CST balance from escrow
   */
  app.get("/api/balance", async (req, res) => {
    try {
      const balance = await sdk.escrow.getUserBalance("CST", WALLET_ADDRESS);
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
   */
  app.post("/api/deployments", async (req, res) => {
    try {
      const parsed = insertDeploymentSchema.parse(req.body);

      // Check balance first
      const balance = await sdk.escrow.getUserBalance("CST", WALLET_ADDRESS);
      const unlockedTokens = Number(balance.unlockedBalance) / 1e6;

      console.log('Deployment attempt with balance:', {
        wallet: WALLET_ADDRESS,
        unlockedTokens: `${unlockedTokens.toFixed(6)} CST`,
        yamlConfig: parsed.iclConfig
      });

      if (!balance || unlockedTokens < 5.0) {
        throw new Error(`Insufficient CST balance in escrow. Available: ${unlockedTokens.toFixed(6)} CST. Required: 5.0 CST`);
      }

      // Create deployment using SDK
      const deploymentTxn = await sdk.deployment.createDeployment(
        parsed.iclConfig,
        PROVIDER_PROXY_URL
      );

      console.log('Deployment transaction:', {
        leaseId: deploymentTxn.leaseId,
        status: deploymentTxn.transaction.status,
        hash: deploymentTxn.transaction.hash
      });

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

          // Store deployment info
          const stored = await storage.createDeployment(parsed);

          // Return comprehensive deployment information
          res.json(sanitizeResponse({
            deployment: stored,
            transaction: deploymentTxn,
            details: deploymentDetails,
            lease: leaseDetails
          }));
        } catch (error) {
          console.error("Error fetching deployment details:", error);
          // Return partial information if some calls fail
          res.json(sanitizeResponse({
            deployment: await storage.createDeployment(parsed),
            transaction: deploymentTxn
          }));
        }
      }
    } catch (error: any) {
      console.error('Error creating deployment:', error);
      res.status(400).json({
        message: "Failed to create deployment",
        error: error.message
      });
    }
  });

  /**
   * GET /api/deployments/:leaseId
   * Returns details about a specific deployment
   */
  app.get("/api/deployments/:leaseId", async (req, res) => {
    try {
      const leaseId = req.params.leaseId;
      if (!leaseId) {
        throw new Error("Lease ID is required");
      }

      const deploymentDetails = await sdk.deployment.getDeployment(
        leaseId,
        PROVIDER_PROXY_URL
      );

      res.json(sanitizeResponse(deploymentDetails));
    } catch (error: any) {
      console.error('Error fetching deployment details:', error);
      res.status(400).json({
        message: "Failed to fetch deployment details",
        error: error.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}