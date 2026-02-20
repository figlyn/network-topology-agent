#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { writeFileSync } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";

// Demo topology data
const DEMO_TOPOLOGY = {
  solutionTitle: "First National Bank — Enterprise SD-WAN",
  customer: "First National Bank",
  industry: "Financial Services",
  customerNodes: [
    { id: "hq", type: "hq_building", label: "Corporate HQ", count: 1, params: ["NYC, dual fiber", "10Gbps DIA"] },
    { id: "branches", type: "branch", label: "Full Branches", count: 85, params: ["500Mbps MPLS", "WiFi 6, SD-WAN"] },
    { id: "express", type: "small_site", label: "Express Branches", count: 20, params: ["200Mbps", "4G failover"] },
    { id: "atm", type: "iot_gateway", label: "ATM Sites", count: 15, params: ["50Mbps + cellular"] },
  ],
  operatorNodes: [
    { id: "access", type: "router", label: "Access Routers", position: "ingress", params: ["Regional PoPs", "CPE aggregation"] },
    { id: "lte", type: "cell_tower", label: "LTE Backup", position: "ingress", params: ["4G/LTE failover"] },
    { id: "sdwan", type: "sdwan", label: "SD-WAN Controller", position: "core", params: ["Managed overlay", "Path selection"] },
    { id: "fw", type: "firewall", label: "NGFW + SASE", position: "core", params: ["DDoS protection", "Zero Trust"] },
    { id: "pe", type: "router", label: "PE Peering Router", position: "egress", params: ["Cloud interconnect", "BGP peering"] },
  ],
  externalNodes: [
    { id: "azure", type: "cloud", label: "Azure", params: ["ExpressRoute", "Primary"] },
    { id: "aws", type: "cloud", label: "AWS", params: ["Direct Connect", "DR"] },
    { id: "saas", type: "saas", label: "Banking SaaS", params: ["FIS/Fiserv"] },
    { id: "inet", type: "internet", label: "Internet", params: ["Scrubbed"] },
  ],
  connections: [
    { from: "hq", to: "access", label: "10G DIA", style: "double" },
    { from: "branches", to: "access", label: "500M MPLS", style: "solid" },
    { from: "express", to: "access", label: "200Mbps", style: "solid" },
    { from: "atm", to: "lte", label: "LTE", style: "dashed" },
    { from: "branches", to: "lte", label: "LTE backup", style: "dashed" },
    { from: "access", to: "sdwan", label: "Overlay", style: "solid" },
    { from: "lte", to: "sdwan", label: "Failover", style: "dashed" },
    { from: "sdwan", to: "fw", label: "Inspect", style: "solid" },
    { from: "fw", to: "pe", label: "Clean", style: "solid" },
    { from: "pe", to: "azure", label: "ExpressRoute", style: "double" },
    { from: "pe", to: "aws", label: "Direct Connect", style: "dashed" },
    { from: "pe", to: "saas", label: "Private peer", style: "solid" },
    { from: "pe", to: "inet", label: "Breakout", style: "solid" },
  ],
};

// Generate SVG from topology data
function generateSvg(data) {
  const w = 1000, h = 600;
  const T = {
    bg: "#0B1120", text: "#F1F5F9", tm: "#64748B",
    opFill: "rgba(99,102,241,0.04)", opStroke: "rgba(129,140,248,0.2)", opLabel: "#818CF8"
  };

  let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="${T.bg}"/>
    <text x="${w/2}" y="35" text-anchor="middle" fill="${T.text}" font-size="18" font-weight="700" font-family="sans-serif">${data.solutionTitle || 'Network Topology'}</text>
    <text x="${w/2}" y="55" text-anchor="middle" fill="${T.tm}" font-size="11" font-family="monospace">${data.customer} · ${data.industry}</text>
    <text x="120" y="80" text-anchor="middle" fill="${T.tm}" font-size="9" font-family="monospace">CUSTOMER</text>
    <text x="${w/2}" y="80" text-anchor="middle" fill="${T.opLabel}" font-size="9" font-family="monospace">OPERATOR NETWORK</text>
    <text x="${w-120}" y="80" text-anchor="middle" fill="${T.tm}" font-size="9" font-family="monospace">EXTERNAL</text>
    <ellipse cx="${w/2}" cy="${h/2}" rx="280" ry="200" fill="${T.opFill}" stroke="${T.opStroke}" stroke-width="2" stroke-dasharray="8,5"/>`;

  // Customer nodes
  const custY = 120, custSpacing = Math.min(100, (h - 200) / Math.max((data.customerNodes || []).length, 1));
  (data.customerNodes || []).forEach((node, i) => {
    const y = custY + i * custSpacing;
    svg += `<circle cx="120" cy="${y}" r="24" fill="rgba(96,165,250,0.1)" stroke="#60A5FA" stroke-width="2"/>`;
    svg += `<text x="120" y="${y+5}" text-anchor="middle" fill="#60A5FA" font-size="10" font-weight="600">${node.label}${node.count > 1 ? ' ×'+node.count : ''}</text>`;
  });

  // Operator nodes
  const opNodes = data.operatorNodes || [];
  const opY = 140, opSpacing = 90;
  [{nodes: opNodes.filter(n=>n.position==='ingress'), x: w/2-180},
   {nodes: opNodes.filter(n=>n.position==='core'), x: w/2},
   {nodes: opNodes.filter(n=>n.position==='egress'), x: w/2+180}].forEach(({nodes, x}) => {
    nodes.forEach((node, i) => {
      const y = opY + i * opSpacing;
      svg += `<rect x="${x-28}" y="${y-18}" width="56" height="36" rx="4" fill="rgba(129,140,248,0.1)" stroke="#818CF8" stroke-width="1.5"/>`;
      svg += `<text x="${x}" y="${y+5}" text-anchor="middle" fill="${T.opLabel}" font-size="9" font-weight="600">${node.label}</text>`;
    });
  });

  // External nodes
  const extY = 120, extSpacing = Math.min(100, (h - 200) / Math.max((data.externalNodes || []).length, 1));
  (data.externalNodes || []).forEach((node, i) => {
    const y = extY + i * extSpacing;
    svg += `<circle cx="${w-120}" cy="${y}" r="24" fill="rgba(34,211,238,0.1)" stroke="#22D3EE" stroke-width="2"/>`;
    svg += `<text x="${w-120}" y="${y+5}" text-anchor="middle" fill="#22D3EE" font-size="10" font-weight="600">${node.label}</text>`;
  });

  svg += '</svg>';
  return svg;
}

const SYSTEM_PROMPT = `You are a telecom solution architect creating B2B network topology diagrams.

Return ONLY valid JSON with this structure:
{
  "solutionTitle": "Short title",
  "customer": "Name",
  "industry": "Industry",
  "customerNodes": [{ "id": "unique", "type": "icon_type", "label": "Name", "count": 1, "params": ["spec1","spec2"] }],
  "operatorNodes": [{ "id": "unique", "type": "icon_type", "label": "Name", "position": "ingress|core|egress", "params": ["spec1","spec2"] }],
  "externalNodes": [{ "id": "unique", "type": "icon_type", "label": "Name", "params": ["spec1","spec2"] }],
  "connections": [{ "from": "id", "to": "id", "label": "concise label", "style": "solid|dashed|double" }]
}

ICON TYPES: hq_building, branch, small_site, factory, data_center, router, switch, firewall, cloud, saas, internet, mpls, wireless_ap, cell_tower, server, mec, iot_gateway, vpn, load_balancer, phone, security_cloud, sdwan, users

RULES:
- Group similar sites (85 branches = 1 node with count:85). Max 5 customer nodes.
- Operator nodes: max 5. MUST set "position" to "ingress", "core", or "egress".
- External nodes: max 5.
- Connection labels: very concise (e.g. "10G DIA", "ExpressRoute", "ZTNA")`;

// Create server
const server = new Server(
  { name: "network-topology-agent", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_topology",
        description: "Generate a B2B telecom network topology diagram from a natural language description. Returns JSON that Claude can render as a diagram description.",
        inputSchema: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "Natural language description of the B2B telecom solution",
            },
            use_demo: {
              type: "boolean",
              description: "Use demo data (First National Bank SD-WAN example)",
            },
          },
          required: ["description"],
        },
      },
      {
        name: "render_topology_text",
        description: "Render a topology as a formatted text diagram that can be displayed in the chat",
        inputSchema: {
          type: "object",
          properties: {
            topology: {
              type: "object",
              description: "Topology JSON data",
            },
          },
          required: ["topology"],
        },
      },
      {
        name: "save_topology_svg",
        description: "Save topology as SVG file and open it in the browser. Use this after generating topology JSON.",
        inputSchema: {
          type: "object",
          properties: {
            topology: {
              type: "object",
              description: "Topology JSON data to render as SVG",
            },
          },
          required: ["topology"],
        },
      },
      {
        name: "open_topology_editor",
        description: "Open the full interactive topology editor in browser with the generated topology",
        inputSchema: {
          type: "object",
          properties: {
            topology: {
              type: "object",
              description: "Topology JSON data",
            },
          },
          required: ["topology"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "generate_topology") {
    if (args.use_demo) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(DEMO_TOPOLOGY, null, 2),
          },
        ],
      };
    }

    // Return instructions for Claude to generate the topology
    return {
      content: [
        {
          type: "text",
          text: `Generate a network topology JSON for this solution:\n\n${args.description}\n\nFollow this schema:\n${SYSTEM_PROMPT}\n\nReturn only valid JSON.`,
        },
      ],
    };
  }

  if (name === "render_topology_text") {
    const t = args.topology;

    // Create ASCII-art style topology representation
    let output = `
╔══════════════════════════════════════════════════════════════════════════════╗
║  ${(t.solutionTitle || "Network Topology").padEnd(74)}║
║  ${(t.customer + " · " + t.industry).padEnd(74)}║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  CUSTOMER PREMISES          OPERATOR NETWORK              EXTERNAL SERVICES  ║
║  ─────────────────          ────────────────              ─────────────────  ║`;

    // Get max rows needed
    const maxRows = Math.max(
      (t.customerNodes || []).length,
      (t.operatorNodes || []).length,
      (t.externalNodes || []).length
    );

    const custNodes = t.customerNodes || [];
    const opNodes = t.operatorNodes || [];
    const extNodes = t.externalNodes || [];

    for (let i = 0; i < maxRows; i++) {
      const cust = custNodes[i];
      const op = opNodes[i];
      const ext = extNodes[i];

      const custStr = cust ? `[${cust.label}${cust.count > 1 ? " ×" + cust.count : ""}]` : "";
      const opStr = op ? `[${op.label}]` : "";
      const extStr = ext ? `[${ext.label}]` : "";

      output += `\n║  ${custStr.padEnd(22)} ${opStr.padEnd(28)} ${extStr.padEnd(22)}║`;
    }

    output += `
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  CONNECTIONS:                                                                ║`;

    for (const conn of (t.connections || []).slice(0, 8)) {
      const connStr = `  ${conn.from} ──${conn.style === "dashed" ? "··" : "──"}► ${conn.to}: ${conn.label}`;
      output += `\n║  ${connStr.padEnd(74)}║`;
    }

    output += `
╚══════════════════════════════════════════════════════════════════════════════╝

View full interactive diagram: https://nwgrm.org`;

    return {
      content: [{ type: "text", text: output }],
    };
  }

  if (name === "save_topology_svg") {
    const svg = generateSvg(args.topology);
    const filename = `topology-${Date.now()}.svg`;
    const filepath = join(tmpdir(), filename);
    writeFileSync(filepath, svg);

    // Open in default browser
    try {
      execSync(`open "${filepath}"`);
    } catch (e) {
      // Fallback for Linux
      try { execSync(`xdg-open "${filepath}"`); } catch {}
    }

    return {
      content: [{
        type: "text",
        text: `SVG saved and opened: ${filepath}\n\nThe topology diagram is now open in your browser.`,
      }],
    };
  }

  if (name === "open_topology_editor") {
    const encoded = encodeURIComponent(JSON.stringify(args.topology));
    const url = `https://nwgrm.org/?topology=${encoded}`;

    try {
      execSync(`open "${url}"`);
    } catch (e) {
      try { execSync(`xdg-open "${url}"`); } catch {}
    }

    return {
      content: [{
        type: "text",
        text: `Opening interactive editor: ${url}\n\nYou can now edit the topology, drag nodes, and export as SVG.`,
      }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Network Topology MCP server running");
}

main().catch(console.error);
