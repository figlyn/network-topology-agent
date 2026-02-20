// Minimal MCP server for ChatGPT Apps integration
// Renders network topology JSON to SVG images

import { renderTopologySVG, TOPOLOGY_SCHEMA, type TopologyData } from "./svg-renderer";

// MCP JSON-RPC types
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// Tool definition for ChatGPT
const RENDER_TOOL = {
  name: "render_topology",
  description: `Render a B2B telecom network topology diagram as an image.

The topology has THREE zones:
1. CUSTOMER ZONE (left) - Customer premises, sites, endpoints
2. OPERATOR NETWORK (center) - Telecom infrastructure with ingress/core/egress sub-zones
3. EXTERNAL SERVICES (right) - Clouds, internet, SaaS

ICON TYPES:
- Customer: hq_building, branch, small_site, factory, data_center, users, iot_gateway, phone
- Operator: router, switch, firewall, sdwan, security_cloud, vpn, cell_tower, mec, load_balancer, mpls, wireless_ap
- External: cloud, saas, internet, server

RULES:
- Group similar sites (85 branches = 1 node with count:85)
- Max 5 nodes per zone
- Operator nodes MUST have position: "ingress", "core", or "egress"
- Connection styles: solid=primary, dashed=backup, double=redundant`,
  inputSchema: TOPOLOGY_SCHEMA,
};

// Server capabilities
const SERVER_INFO = {
  name: "network-topology-agent",
  version: "1.0.0",
};

const CAPABILITIES = {
  tools: {},
};

function makeResponse(id: string | number, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function makeError(id: string | number, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

export async function handleMcpRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { id, method, params } = request;

  switch (method) {
    case "initialize":
      return makeResponse(id, {
        protocolVersion: "2024-11-05",
        serverInfo: SERVER_INFO,
        capabilities: CAPABILITIES,
      });

    case "notifications/initialized":
      // Client acknowledgment - no response needed for notifications
      return makeResponse(id, {});

    case "tools/list":
      return makeResponse(id, {
        tools: [RENDER_TOOL],
      });

    case "tools/call": {
      const p = params as { name: string; arguments?: Record<string, unknown> };

      if (p.name !== "render_topology") {
        return makeError(id, -32602, `Unknown tool: ${p.name}`);
      }

      try {
        const topology = p.arguments as unknown as TopologyData;

        // Validate required fields
        if (!topology.solutionTitle || !topology.customerNodes || !topology.operatorNodes || !topology.externalNodes || !topology.connections) {
          return makeError(id, -32602, "Invalid topology: missing required fields");
        }

        const svg = renderTopologySVG(topology);
        const base64SVG = btoa(unescape(encodeURIComponent(svg)));

        return makeResponse(id, {
          content: [
            {
              type: "image",
              data: base64SVG,
              mimeType: "image/svg+xml",
            },
          ],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return makeError(id, -32603, `Render failed: ${message}`);
      }
    }

    case "ping":
      return makeResponse(id, {});

    default:
      return makeError(id, -32601, `Method not found: ${method}`);
  }
}

// HTTP handler for the /mcp endpoint
export async function handleMcpHttp(request: Request): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json() as JsonRpcRequest;

    if (body.jsonrpc !== "2.0" || !body.method) {
      return new Response(JSON.stringify(makeError(body.id || 0, -32600, "Invalid JSON-RPC request")), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await handleMcpRequest(body);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify(makeError(0, -32700, `Parse error: ${message}`)), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
