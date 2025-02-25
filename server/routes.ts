import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { SpheronSDK } from "@spheron/protocol-sdk";
import { insertDeploymentSchema } from "@shared/schema";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PRIVATE_KEY = process.env.SPHERON_PRIVATE_KEY;
const PROVIDER_PROXY_URL = "https://provider-proxy.spheron.network";

if (!PRIVATE_KEY) {
  throw new Error("SPHERON_PRIVATE_KEY environment variable is required");
}

// Initialize SDK with testnet network explicitly
const sdk = new SpheronSDK("testnet", PRIVATE_KEY);

// Helper function to safely convert bigint to string in objects
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Get CST balance from escrow
  app.get("/api/balance", async (req, res) => {
    try {
      const balance = await sdk.escrow.getUserBalance("CST");
      res.json(sanitizeResponse(balance));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create new deployment
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

      // Fetch deployment details
      let deploymentDetails = null;
      let leaseDetails = null;

      if (deploymentTxn.leaseId) {
        deploymentDetails = await sdk.deployment.getDeployment(
          deploymentTxn.leaseId,
          PROVIDER_PROXY_URL
        );
        leaseDetails = await sdk.leases.getLeaseDetails(deploymentTxn.leaseId);
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
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}