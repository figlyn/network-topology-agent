// Test fixtures for topology data

import type { TopologyData } from "./schemas";

// Minimal valid topology
export const minimalTopology: TopologyData = {
  solutionTitle: "Test Network",
  customer: "Test Corp",
  industry: "Technology",
  customerNodes: [
    { id: "hq1", type: "hq_building", label: "Headquarters" }
  ],
  operatorNodes: [
    { id: "router1", type: "router", label: "Edge Router", position: "ingress" }
  ],
  externalNodes: [
    { id: "cloud1", type: "cloud", label: "AWS" }
  ],
  connections: [
    { from: "hq1", to: "router1" },
    { from: "router1", to: "cloud1" }
  ]
};

// Full topology with all features
export const fullTopology: TopologyData = {
  solutionTitle: "Enterprise SD-WAN Solution",
  customer: "Acme Corporation",
  industry: "Manufacturing",
  customerNodes: [
    { id: "hq", type: "hq_building", label: "HQ Office", count: 1, params: ["500 users", "10Gbps"] },
    { id: "branch1", type: "branch", label: "Branch Office", count: 5, params: ["50 users"] },
    { id: "factory", type: "factory", label: "Manufacturing Plant", params: ["IoT sensors"] }
  ],
  operatorNodes: [
    { id: "sdwan", type: "sdwan", label: "SD-WAN Controller", position: "ingress" },
    { id: "fw", type: "firewall", label: "Next-Gen Firewall", position: "core" },
    { id: "lb", type: "load_balancer", label: "Load Balancer", position: "egress" }
  ],
  externalNodes: [
    { id: "aws", type: "cloud", label: "AWS", params: ["us-east-1"] },
    { id: "saas", type: "saas", label: "Office 365" }
  ],
  connections: [
    { from: "hq", to: "sdwan", label: "MPLS", style: "solid" },
    { from: "branch1", to: "sdwan", label: "Internet", style: "dashed" },
    { from: "factory", to: "sdwan", label: "5G", style: "double" },
    { from: "sdwan", to: "fw" },
    { from: "fw", to: "lb" },
    { from: "lb", to: "aws" },
    { from: "lb", to: "saas" }
  ]
};

// Invalid topologies for testing validation
export const invalidTopologies = {
  emptyTitle: {
    ...minimalTopology,
    solutionTitle: ""
  },
  titleTooLong: {
    ...minimalTopology,
    solutionTitle: "A".repeat(101)
  },
  invalidNodeType: {
    ...minimalTopology,
    customerNodes: [{ id: "n1", type: "invalid_type" as any, label: "Test" }]
  },
  duplicateNodeIds: {
    ...minimalTopology,
    customerNodes: [
      { id: "same_id", type: "hq_building" as const, label: "HQ1" },
      { id: "same_id", type: "branch" as const, label: "Branch" }
    ]
  },
  tooManyNodes: {
    ...minimalTopology,
    customerNodes: Array.from({ length: 15 }, (_, i) => ({
      id: `node${i}`,
      type: "branch" as const,
      label: `Node ${i}`
    }))
  },
  connectionToNonexistent: {
    ...minimalTopology,
    connections: [
      { from: "hq1", to: "nonexistent" }
    ]
  }
};
