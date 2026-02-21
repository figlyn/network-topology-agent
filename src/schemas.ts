// Shared Zod schemas and TypeScript types for topology data

import { z } from "zod";

// Node type enums
export const CustomerNodeTypes = [
  "hq_building", "branch", "small_site", "factory",
  "data_center", "users", "iot_gateway", "phone"
] as const;

export const OperatorNodeTypes = [
  "router", "switch", "firewall", "sdwan", "security_cloud",
  "vpn", "cell_tower", "mec", "load_balancer", "mpls",
  "data_center", "wireless_ap"
] as const;

export const ExternalNodeTypes = [
  "cloud", "saas", "internet", "server", "data_center"
] as const;

export const OperatorPositions = ["ingress", "core", "egress"] as const;
export const ConnectionStyles = ["solid", "dashed", "double"] as const;

// Limits for input validation
export const LIMITS = {
  maxCustomerNodes: 10,
  maxOperatorNodes: 10,
  maxExternalNodes: 10,
  maxConnections: 50,
  maxLabelLength: 50,
  maxParams: 5,
  maxParamLength: 30,
  maxTitleLength: 100,
  maxBase64DataLength: 50000, // ~37KB decoded
} as const;

// Base node schema (shared fields)
const BaseNodeSchema = z.object({
  id: z.string().min(1).max(50),
  label: z.string().min(1).max(LIMITS.maxLabelLength),
  count: z.number().int().min(1).max(9999).optional(),
  params: z.array(z.string().max(LIMITS.maxParamLength)).max(LIMITS.maxParams).optional(),
});

// Customer node schema
export const CustomerNodeSchema = BaseNodeSchema.extend({
  type: z.enum(CustomerNodeTypes),
});

// Operator node schema
export const OperatorNodeSchema = BaseNodeSchema.extend({
  type: z.enum(OperatorNodeTypes),
  position: z.enum(OperatorPositions),
});

// External node schema
export const ExternalNodeSchema = BaseNodeSchema.extend({
  type: z.enum(ExternalNodeTypes),
});

// Connection schema
export const ConnectionSchema = z.object({
  from: z.string().min(1).max(50),
  to: z.string().min(1).max(50),
  label: z.string().max(LIMITS.maxLabelLength).optional(),
  style: z.enum(ConnectionStyles).optional(),
});

// Full topology schema
export const TopologySchema = z.object({
  solutionTitle: z.string().min(1).max(LIMITS.maxTitleLength),
  customer: z.string().min(1).max(LIMITS.maxTitleLength),
  industry: z.string().min(1).max(LIMITS.maxTitleLength),
  customerNodes: z.array(CustomerNodeSchema).max(LIMITS.maxCustomerNodes),
  operatorNodes: z.array(OperatorNodeSchema).max(LIMITS.maxOperatorNodes),
  externalNodes: z.array(ExternalNodeSchema).max(LIMITS.maxExternalNodes),
  connections: z.array(ConnectionSchema).max(LIMITS.maxConnections),
});

// TypeScript types derived from schemas
export type CustomerNode = z.infer<typeof CustomerNodeSchema>;
export type OperatorNode = z.infer<typeof OperatorNodeSchema>;
export type ExternalNode = z.infer<typeof ExternalNodeSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type TopologyData = z.infer<typeof TopologySchema>;

// Validation helper
export function validateTopology(data: unknown): { success: true; data: TopologyData } | { success: false; error: string } {
  const result = TopologySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Zod v4 uses 'issues' instead of 'errors'
  const firstIssue = result.error.issues?.[0];
  const path = firstIssue?.path?.join(".") || "root";
  const message = firstIssue?.message || "Invalid data";
  return { success: false, error: path ? `${path}: ${message}` : message };
}
