import { pgTable, text, serial, integer, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  iclConfig: text("icl_config").notNull(),
  status: text("status").notNull().default("pending"),
  providerUrl: text("provider_url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeploymentSchema = createInsertSchema(deployments).pick({
  name: true,
  iclConfig: true,
  providerUrl: true,
});

export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;
