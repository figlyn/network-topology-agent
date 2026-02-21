# Node.js ChatGPT App Implementation Guide

Complete reference for building ChatGPT Apps with Node.js/TypeScript.

## Key Patterns

### 1. SSE Transport (Not Stdio)

ChatGPT Apps require HTTP-based transport:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const server = createAppServer();
const transport = new SSEServerTransport("/mcp", res);

await server.connect(transport);
```

### 2. Single Path, Two Methods

Use the SAME path for both operations:
- `GET /mcp` - Establishes SSE stream connection
- `POST /mcp` - Handles messages

**Do NOT use separate paths** like `/mcp/messages`.

### 3. Tool Definitions Use JSON Schema

```typescript
const tools: Tool[] = [{
  name: "myapp_action",
  inputSchema: {
    type: "object",
    properties: {
      param: { type: "string", description: "..." }
    },
    required: ["param"],
    additionalProperties: false,
  },
}];
```

### 4. Tool Metadata

```typescript
_meta: {
  "openai/outputTemplate": "ui://widget/app.html",
  "openai/widgetAccessible": true,
}
```

### 5. Tool Annotations

```typescript
annotations: {
  readOnlyHint: true,      // No side effects
  destructiveHint: false,  // Doesn't delete data
  openWorldHint: false,    // Doesn't affect external systems
}
```

### 6. Response Structure

```typescript
return {
  content: [{ type: "text", text: "Summary for model" }],
  structuredContent: { /* Data model can process */ },
  _meta: { /* Widget-only data, hidden from model */ },
};
```

---

## Cloudflare Workers Implementation

For Cloudflare Workers, use `WebStandardStreamableHTTPServerTransport`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

export async function handleMcpHttp(request: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport();
  const server = createServer();

  await server.connect(transport);
  const response = await transport.handleRequest(request);

  return response;
}
```

---

## Resource Registration with _meta

Critical for widget rendering:

```typescript
// Tool definition needs _meta
registerAppTool(
  server,
  "generate_network_diagram",
  {
    title: "Generate Network Diagram",
    description: "...",
    inputSchema: { ... },
    _meta: {
      ui: { resourceUri: "ui://widget/app.html" },
    },
  },
  async (args) => {
    return {
      structuredContent: { data: args },
      content: [{ type: "text", text: "Generated diagram" }],
      _meta: {
        "openai/outputTemplate": "ui://widget/app.html",
      },
    };
  }
);
```

---

## Quality Checklist

### Server Implementation
- [ ] Uses SSEServerTransport or WebStandardStreamableHTTPServerTransport
- [ ] Uses SAME path for GET and POST
- [ ] Includes CORS headers on all responses
- [ ] Health check endpoint

### Tool Configuration
- [ ] Tool schemas are JSON Schema objects
- [ ] Response uses content/structuredContent/_meta layers
- [ ] `_meta["openai/outputTemplate"]` matches resource URI

### Widget & Resources
- [ ] Resource registered with correct mimeType
- [ ] ListResources includes `_meta` with widget config
- [ ] Tool responses include `_meta["openai/outputTemplate"]`
