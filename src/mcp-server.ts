// MCP server with Apps SDK for ChatGPT UI integration
// Uses WebStandardStreamableHTTPServerTransport for Cloudflare Workers

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { renderTopologySVG } from "./svg-renderer";
import {
  CustomerNodeTypes,
  OperatorNodeTypes,
  ExternalNodeTypes,
  OperatorPositions,
  ConnectionStyles,
  LIMITS,
  validateTopology,
  type TopologyData,
} from "./schemas";
import { corsHeaders, withCors, errorResponse } from "./cors";

// HTML widget that displays SVG content with ChatGPT styling
const SVG_VIEWER_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Söhne, ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: #fff;
      min-height: 100vh;
    }
    .container {
      width: 100%;
      padding: 16px;
    }
    .svg-container {
      width: 100%;
      overflow-x: auto;
      border-radius: 8px;
      background: #f7f7f8;
    }
    .svg-container svg {
      display: block;
      max-width: 100%;
      height: auto;
    }
    .error {
      color: #ef4444;
      padding: 16px;
      text-align: center;
      font-size: 14px;
    }
    .loading {
      color: #6b7280;
      padding: 32px;
      text-align: center;
    }
    .debug {
      padding: 16px;
      background: #f7f7f8;
      border-radius: 8px;
      overflow: auto;
    }
    .debug pre {
      font-family: Söhne Mono, ui-monospace, Menlo, Monaco, monospace;
      font-size: 11px;
      text-align: left;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .debug h3 {
      font-size: 12px;
      color: #374151;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="content" class="loading">Loading diagram...</div>
  </div>
  <script type="module">
    const content = document.getElementById('content');
    let rendered = false;

    function renderSvg(svg) {
      if (rendered) return;
      rendered = true;
      content.className = 'svg-container';
      content.innerHTML = svg;
    }

    function showDebug(info) {
      if (rendered) return;
      rendered = true;
      content.className = 'debug';
      content.innerHTML = '<h3>Debug: window.openai structure</h3><pre>' +
        JSON.stringify(info, null, 2) + '</pre>';
    }

    function tryGetSvg(openai) {
      // Try all documented and possible locations
      return openai?.toolResponseMetadata?.svg
          || openai?.toolOutput?.svg
          || openai?.responseMetadata?.svg
          || openai?.output?.svg
          || openai?.structuredContent?.svg
          || openai?.content?.svg
          || openai?.data?.svg
          || openai?.svg;
    }

    function tryRender() {
      const openai = window.openai;
      if (!openai) return false;

      const svg = tryGetSvg(openai);
      if (svg && typeof svg === 'string' && svg.includes('<svg')) {
        renderSvg(svg);
        return true;
      }
      return false;
    }

    // Listen for OpenAI message events (preferred method)
    window.addEventListener('message', (event) => {
      if (rendered) return;

      // Check if this is an OpenAI tool output message
      const data = event.data;
      if (data && typeof data === 'object') {
        const svg = data.svg
                 || data.payload?.svg
                 || data.toolOutput?.svg
                 || data.structuredContent?.svg;
        if (svg && typeof svg === 'string' && svg.includes('<svg')) {
          renderSvg(svg);
        }
      }
    });

    // Try immediately
    if (!tryRender()) {
      // Poll with exponential backoff (100ms -> 200ms -> 400ms -> ... max 1600ms)
      let attempts = 0;
      let delay = 100;
      const maxAttempts = 50; // Total ~15 seconds with backoff

      function poll() {
        attempts++;
        if (tryRender()) return;

        if (attempts >= maxAttempts) {
          // Show debug info after timeout
          const openai = window.openai || {};
          showDebug({
            message: 'SVG not found after ' + attempts + ' attempts',
            keys: Object.keys(openai),
            toolOutput: openai.toolOutput,
            toolResponseMetadata: openai.toolResponseMetadata,
            hasOpenai: !!window.openai,
          });
          return;
        }

        // Exponential backoff capped at 1600ms
        if (attempts % 10 === 0 && delay < 1600) {
          delay = Math.min(delay * 2, 1600);
        }
        setTimeout(poll, delay);
      }

      setTimeout(poll, delay);
    }
  </script>
</body>
</html>
`.trim();

// Resource URI for the SVG viewer widget (v8 with improved data access)
const SVG_VIEWER_URI = "ui://widget/svg-viewer-v8.html";

// Create MCP server instance
function createServer(): McpServer {
  const server = new McpServer({
    name: "network-topology-agent",
    version: "1.0.0",
  });

  // Register the SVG viewer widget as a resource
  registerAppResource(
    server,
    "SVG Diagram Viewer",
    SVG_VIEWER_URI,
    {
      description: "Widget to display network topology diagrams",
    },
    async () => ({
      contents: [
        {
          uri: SVG_VIEWER_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: SVG_VIEWER_HTML,
        },
      ],
    })
  );

  // Register the topology generation tool with UI
  registerAppTool(
    server,
    "generate_network_diagram",
    {
      title: "Generate Network Diagram",
      description: `Generate a professional Cisco-style network topology diagram. USE THIS TOOL whenever the user asks for a network diagram, topology, or network architecture visualization.

This creates beautiful SVG diagrams with three zones:
- LEFT: Customer premises (offices, branches, factories)
- CENTER: Operator/telco network cloud (routers, firewalls, SD-WAN)
- RIGHT: External services (AWS, Azure, SaaS, Internet)

ALWAYS use this tool for network diagrams - it produces much better results than Python/matplotlib.`,
      inputSchema: {
        solutionTitle: z.string().min(1).max(LIMITS.maxTitleLength).describe("Short title for the solution"),
        customer: z.string().min(1).max(LIMITS.maxTitleLength).describe("Customer name"),
        industry: z.string().min(1).max(LIMITS.maxTitleLength).describe("Industry vertical"),
        customerNodes: z.array(z.object({
          id: z.string().min(1).max(50).describe("Unique identifier"),
          type: z.enum(CustomerNodeTypes),
          label: z.string().min(1).max(LIMITS.maxLabelLength).describe("Display name"),
          count: z.number().int().min(1).max(9999).optional().describe("Number of similar sites"),
          params: z.array(z.string().max(LIMITS.maxParamLength)).max(LIMITS.maxParams).optional().describe("2-3 specs like '10G DIA', 'WiFi 6'"),
        })).max(LIMITS.maxCustomerNodes).describe("Customer premises nodes (max 10)"),
        operatorNodes: z.array(z.object({
          id: z.string().min(1).max(50),
          type: z.enum(OperatorNodeTypes),
          label: z.string().min(1).max(LIMITS.maxLabelLength),
          position: z.enum(OperatorPositions).describe("ingress=access-facing, core=internal, egress=peering"),
          params: z.array(z.string().max(LIMITS.maxParamLength)).max(LIMITS.maxParams).optional(),
        })).max(LIMITS.maxOperatorNodes).describe("Operator network nodes (max 10). MUST set position."),
        externalNodes: z.array(z.object({
          id: z.string().min(1).max(50),
          type: z.enum(ExternalNodeTypes),
          label: z.string().min(1).max(LIMITS.maxLabelLength),
          params: z.array(z.string().max(LIMITS.maxParamLength)).max(LIMITS.maxParams).optional(),
        })).max(LIMITS.maxExternalNodes).describe("External services (max 10)"),
        connections: z.array(z.object({
          from: z.string().min(1).max(50).describe("Source node ID"),
          to: z.string().min(1).max(50).describe("Target node ID"),
          label: z.string().max(LIMITS.maxLabelLength).optional().describe("Concise label like '10G DIA', 'MPLS'"),
          style: z.enum(ConnectionStyles).optional().describe("solid=primary, dashed=backup, double=redundant"),
        })).max(LIMITS.maxConnections),
      },
      _meta: {
        ui: { resourceUri: SVG_VIEWER_URI },
      },
    },
    async (args) => {
      try {
        // Validate input with Zod schema
        const validation = validateTopology(args);
        if (!validation.success) {
          return {
            content: [{ type: "text", text: `Invalid topology: ${validation.error}` }],
            isError: true,
          };
        }

        const topology = validation.data;

        // Additional semantic validation
        const allNodeIds = new Set([
          ...topology.customerNodes.map(n => n.id),
          ...topology.operatorNodes.map(n => n.id),
          ...topology.externalNodes.map(n => n.id),
        ]);

        // Check for duplicate IDs
        const totalNodes = topology.customerNodes.length + topology.operatorNodes.length + topology.externalNodes.length;
        if (allNodeIds.size !== totalNodes) {
          return {
            content: [{ type: "text", text: "Invalid topology: duplicate node IDs found" }],
            isError: true,
          };
        }

        // Validate connection references
        for (const conn of topology.connections) {
          if (!allNodeIds.has(conn.from)) {
            return {
              content: [{ type: "text", text: `Invalid topology: connection references unknown node '${conn.from}'` }],
              isError: true,
            };
          }
          if (!allNodeIds.has(conn.to)) {
            return {
              content: [{ type: "text", text: `Invalid topology: connection references unknown node '${conn.to}'` }],
              isError: true,
            };
          }
        }

        // Render the SVG
        const svg = renderTopologySVG(topology);

        // Return structured content for the widget + text for the model
        return {
          structuredContent: {
            svg: svg,
            title: topology.solutionTitle,
          },
          content: [
            {
              type: "text",
              text: `Generated network diagram: ${topology.solutionTitle}`,
            },
          ],
          _meta: {
            svg: svg,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text", text: `Render failed: ${message}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}

// HTTP handler for Cloudflare Workers
export async function handleMcpHttp(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create fresh server and transport per request (stateless mode)
    const transport = new WebStandardStreamableHTTPServerTransport();
    const server = createServer();

    await server.connect(transport);

    const response = await transport.handleRequest(request);

    // Add CORS headers to response
    return withCors(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
}

// Direct render endpoint (for URL fallback) with security measures
export async function handleRenderRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const url = new URL(request.url);
    const base64Data = url.searchParams.get("data");

    if (!base64Data) {
      return errorResponse("Missing data parameter", 400);
    }

    // Security: Check base64 data size before decoding
    if (base64Data.length > LIMITS.maxBase64DataLength) {
      return errorResponse(`Data too large (max ${LIMITS.maxBase64DataLength} chars)`, 400);
    }

    // Decode and parse
    let topologyJson: string;
    try {
      topologyJson = decodeURIComponent(escape(atob(base64Data)));
    } catch {
      return errorResponse("Invalid base64 encoding", 400);
    }

    let rawData: unknown;
    try {
      rawData = JSON.parse(topologyJson);
    } catch {
      return errorResponse("Invalid JSON", 400);
    }

    // Validate with schema
    const validation = validateTopology(rawData);
    if (!validation.success) {
      return errorResponse(`Invalid topology: ${validation.error}`, 400);
    }

    const svg = renderTopologySVG(validation.data);

    return new Response(svg, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(`Render error: ${message}`, 500);
  }
}
