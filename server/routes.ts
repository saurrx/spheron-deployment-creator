import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { SpheronSDK } from "@spheron/protocol-sdk";
import { insertDeploymentSchema } from "@shared/schema";

if (!process.env.SPHERON_PRIVATE_KEY) {
  throw new Error("SPHERON_PRIVATE_KEY environment variable is required");
}

// Initialize SDK with testnet network explicitly
const sdk = new SpheronSDK({ 
  privateKey: process.env.SPHERON_PRIVATE_KEY || "",
  network: "testnet"
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get USDT balance from escrow
  app.get("/api/balance", async (req, res) => {
    try {
      const balance = await sdk.escrow.getUserBalance("USDT");
      res.json(balance);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create new deployment
  app.post("/api/deployments", async (req, res) => {
    try {
      const parsed = insertDeploymentSchema.parse(req.body);

      // Check balance first
      const balance = await sdk.escrow.getUserBalance("USDT");
      if (!balance || parseFloat(balance) <= 0) {
        throw new Error("Insufficient USDT balance in escrow");
      }

      // Create deployment using SDK
      const deployment = await sdk.deployment.createDeployment(
        parsed.iclConfig,
        parsed.providerUrl
      );

      // Store deployment info without passing status
      const stored = await storage.createDeployment(parsed);

      res.json(stored);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}