import { describe, it, expect } from "vitest";
import { renderTopologySVG } from "./svg-renderer";
import { minimalTopology, fullTopology } from "./test-fixtures";

describe("svg-renderer", () => {
  describe("renderTopologySVG", () => {
    it("renders minimal topology", () => {
      const svg = renderTopologySVG(minimalTopology);

      // Should be valid SVG
      expect(svg).toMatch(/^<svg/);
      expect(svg).toMatch(/<\/svg>$/);

      // Should contain title
      expect(svg).toContain("Test Network");

      // Should contain customer/industry info
      expect(svg).toContain("Test Corp");
      expect(svg).toContain("Technology");
    });

    it("renders full topology with all features", () => {
      const svg = renderTopologySVG(fullTopology);

      // Should contain solution title
      expect(svg).toContain("Enterprise SD-WAN Solution");

      // Should contain node labels
      expect(svg).toContain("HQ Office");
      expect(svg).toContain("Branch Office");
      expect(svg).toContain("Manufacturing Plant");
      expect(svg).toContain("SD-WAN Controller");
      expect(svg).toContain("Next-Gen Firewall");
      expect(svg).toContain("AWS");

      // Should contain connection labels
      expect(svg).toContain("MPLS");
      expect(svg).toContain("Internet");
      expect(svg).toContain("5G");
    });

    it("escapes XML special characters", () => {
      const topology = {
        ...minimalTopology,
        solutionTitle: "Test <Network> & \"Stuff\"",
        customer: "Acme & Co"
      };

      const svg = renderTopologySVG(topology);

      // Should escape special characters
      expect(svg).toContain("&lt;Network&gt;");
      expect(svg).toContain("&amp;");
      expect(svg).toContain("&quot;");

      // Should not contain unescaped characters
      expect(svg).not.toContain("<Network>");
    });

    it("renders node counts", () => {
      const svg = renderTopologySVG(fullTopology);

      // Branch has count: 5
      expect(svg).toContain("(×5)");
    });

    it("renders node params", () => {
      const svg = renderTopologySVG(fullTopology);

      // HQ has params: ["500 users", "10Gbps"]
      expect(svg).toContain("500 users");
      expect(svg).toContain("10Gbps");
    });

    it("includes zone labels", () => {
      const svg = renderTopologySVG(minimalTopology);

      expect(svg).toContain("CUSTOMER PREMISES");
      expect(svg).toContain("OPERATOR NETWORK");
      expect(svg).toContain("EXTERNAL SERVICES");
    });

    it("includes ingress/egress markers", () => {
      const svg = renderTopologySVG(minimalTopology);

      expect(svg).toContain("INGRESS");
      expect(svg).toContain("EGRESS");
    });

    it("handles empty node arrays gracefully", () => {
      const topology = {
        ...minimalTopology,
        customerNodes: [],
        operatorNodes: [],
        externalNodes: [],
        connections: []
      };

      const svg = renderTopologySVG(topology);

      // Should still produce valid SVG
      expect(svg).toMatch(/^<svg/);
      expect(svg).toMatch(/<\/svg>$/);
    });

    it("handles connections with missing nodes gracefully", () => {
      const topology = {
        ...minimalTopology,
        connections: [
          { from: "nonexistent1", to: "nonexistent2" },
          { from: "hq1", to: "router1" } // valid connection
        ]
      };

      // Should not throw
      expect(() => renderTopologySVG(topology)).not.toThrow();
    });

    it("renders dashed connection style", () => {
      const topology = {
        ...minimalTopology,
        connections: [
          { from: "hq1", to: "router1", style: "dashed" as const }
        ]
      };

      const svg = renderTopologySVG(topology);

      // Dashed style should appear in stroke-dasharray
      expect(svg).toContain('stroke-dasharray="9,6"');
    });

    it("renders double connection style", () => {
      const topology = {
        ...minimalTopology,
        connections: [
          { from: "hq1", to: "router1", style: "double" as const }
        ]
      };

      const svg = renderTopologySVG(topology);

      // Double style should have wider stroke
      expect(svg).toContain('stroke-width="4"');
    });

    it("returns SVG with correct dimensions", () => {
      const svg = renderTopologySVG(minimalTopology);

      // Check viewBox and dimensions
      expect(svg).toContain('width="1600"');
      expect(svg).toContain('height="1000"');
      expect(svg).toContain('viewBox="0 0 1600 1000"');
    });

    it("includes required SVG elements", () => {
      const svg = renderTopologySVG(minimalTopology);

      // Should have defs with patterns and markers
      expect(svg).toContain("<defs>");
      expect(svg).toContain("<pattern");
      expect(svg).toContain("<marker");

      // Should have cloud path for operator network
      expect(svg).toContain("stroke-dasharray");
    });
  });
});
