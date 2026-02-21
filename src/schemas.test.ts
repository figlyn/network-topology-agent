import { describe, it, expect } from "vitest";
import {
  validateTopology,
  CustomerNodeSchema,
  OperatorNodeSchema,
  ExternalNodeSchema,
  ConnectionSchema,
  LIMITS,
} from "./schemas";
import { minimalTopology, fullTopology, invalidTopologies } from "./test-fixtures";

describe("schemas", () => {
  describe("validateTopology", () => {
    it("validates minimal topology", () => {
      const result = validateTopology(minimalTopology);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.solutionTitle).toBe("Test Network");
      }
    });

    it("validates full topology with all features", () => {
      const result = validateTopology(fullTopology);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customerNodes).toHaveLength(3);
        expect(result.data.operatorNodes).toHaveLength(3);
        expect(result.data.externalNodes).toHaveLength(2);
        expect(result.data.connections).toHaveLength(7);
      }
    });

    it("rejects empty solution title", () => {
      const result = validateTopology(invalidTopologies.emptyTitle);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("solutionTitle");
      }
    });

    it("rejects title exceeding max length", () => {
      const result = validateTopology(invalidTopologies.titleTooLong);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("solutionTitle");
      }
    });

    it("rejects invalid node type", () => {
      const result = validateTopology(invalidTopologies.invalidNodeType);
      expect(result.success).toBe(false);
    });

    it("rejects too many customer nodes", () => {
      const result = validateTopology(invalidTopologies.tooManyNodes);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("customerNodes");
      }
    });

    it("handles null input", () => {
      const result = validateTopology(null);
      expect(result.success).toBe(false);
    });

    it("handles undefined input", () => {
      const result = validateTopology(undefined);
      expect(result.success).toBe(false);
    });

    it("handles non-object input", () => {
      const result = validateTopology("not an object");
      expect(result.success).toBe(false);
    });
  });

  describe("CustomerNodeSchema", () => {
    it("validates valid customer node", () => {
      const node = { id: "hq1", type: "hq_building", label: "HQ" };
      const result = CustomerNodeSchema.safeParse(node);
      expect(result.success).toBe(true);
    });

    it("validates node with count and params", () => {
      const node = {
        id: "branch1",
        type: "branch",
        label: "Branch Office",
        count: 5,
        params: ["100 users", "1Gbps"]
      };
      const result = CustomerNodeSchema.safeParse(node);
      expect(result.success).toBe(true);
    });

    it("rejects invalid type", () => {
      const node = { id: "n1", type: "invalid", label: "Test" };
      const result = CustomerNodeSchema.safeParse(node);
      expect(result.success).toBe(false);
    });

    it("rejects empty id", () => {
      const node = { id: "", type: "hq_building", label: "HQ" };
      const result = CustomerNodeSchema.safeParse(node);
      expect(result.success).toBe(false);
    });

    it("rejects label exceeding max length", () => {
      const node = { id: "n1", type: "hq_building", label: "A".repeat(LIMITS.maxLabelLength + 1) };
      const result = CustomerNodeSchema.safeParse(node);
      expect(result.success).toBe(false);
    });

    it("rejects too many params", () => {
      const node = {
        id: "n1",
        type: "hq_building",
        label: "HQ",
        params: Array.from({ length: LIMITS.maxParams + 1 }, (_, i) => `param${i}`)
      };
      const result = CustomerNodeSchema.safeParse(node);
      expect(result.success).toBe(false);
    });
  });

  describe("OperatorNodeSchema", () => {
    it("validates valid operator node", () => {
      const node = { id: "r1", type: "router", label: "Edge Router", position: "ingress" };
      const result = OperatorNodeSchema.safeParse(node);
      expect(result.success).toBe(true);
    });

    it("validates all position types", () => {
      const positions = ["ingress", "core", "egress"] as const;
      for (const position of positions) {
        const node = { id: "n1", type: "router", label: "Router", position };
        const result = OperatorNodeSchema.safeParse(node);
        expect(result.success).toBe(true);
      }
    });

    it("rejects missing position", () => {
      const node = { id: "r1", type: "router", label: "Router" };
      const result = OperatorNodeSchema.safeParse(node);
      expect(result.success).toBe(false);
    });

    it("rejects invalid position", () => {
      const node = { id: "r1", type: "router", label: "Router", position: "middle" };
      const result = OperatorNodeSchema.safeParse(node);
      expect(result.success).toBe(false);
    });
  });

  describe("ExternalNodeSchema", () => {
    it("validates valid external node", () => {
      const node = { id: "aws", type: "cloud", label: "AWS" };
      const result = ExternalNodeSchema.safeParse(node);
      expect(result.success).toBe(true);
    });

    it("validates all external node types", () => {
      const types = ["cloud", "saas", "internet", "server", "data_center"] as const;
      for (const type of types) {
        const node = { id: "n1", type, label: "External" };
        const result = ExternalNodeSchema.safeParse(node);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("ConnectionSchema", () => {
    it("validates minimal connection", () => {
      const conn = { from: "a", to: "b" };
      const result = ConnectionSchema.safeParse(conn);
      expect(result.success).toBe(true);
    });

    it("validates connection with label and style", () => {
      const conn = { from: "a", to: "b", label: "10Gbps", style: "dashed" };
      const result = ConnectionSchema.safeParse(conn);
      expect(result.success).toBe(true);
    });

    it("validates all connection styles", () => {
      const styles = ["solid", "dashed", "double"] as const;
      for (const style of styles) {
        const conn = { from: "a", to: "b", style };
        const result = ConnectionSchema.safeParse(conn);
        expect(result.success).toBe(true);
      }
    });

    it("rejects empty from", () => {
      const conn = { from: "", to: "b" };
      const result = ConnectionSchema.safeParse(conn);
      expect(result.success).toBe(false);
    });

    it("rejects invalid style", () => {
      const conn = { from: "a", to: "b", style: "dotted" };
      const result = ConnectionSchema.safeParse(conn);
      expect(result.success).toBe(false);
    });
  });

  describe("LIMITS", () => {
    it("has reasonable limits defined", () => {
      expect(LIMITS.maxCustomerNodes).toBeGreaterThan(0);
      expect(LIMITS.maxOperatorNodes).toBeGreaterThan(0);
      expect(LIMITS.maxExternalNodes).toBeGreaterThan(0);
      expect(LIMITS.maxConnections).toBeGreaterThan(0);
      expect(LIMITS.maxLabelLength).toBeGreaterThan(0);
    });
  });
});
