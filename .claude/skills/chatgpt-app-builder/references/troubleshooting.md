# ChatGPT App Troubleshooting Guide

Common issues and solutions when building ChatGPT Apps.

Based on [official troubleshooting guide](https://developers.openai.com/apps-sdk/deploy/troubleshooting).

---

## Critical: Multi-Connection Session Routing

> **⚠️ This is the #1 cause of "tool works but widget shows nothing" bugs.**

ChatGPT opens **multiple SSE connections** for the same tool call (speculative execution, retries, widget resource loading). If POST messages are routed to the wrong session, responses are **silently lost**.

**Symptoms:**
- Widget shows `hasToolOutput: false` despite server logs showing successful response
- SSE connection closes unexpectedly after tool completes
- Intermittent failures (works sometimes, fails other times)
- Server logs show correct response generated but widget times out

**Root Cause:** Iterating through all sessions and handling with whichever "works":

```typescript
// ❌ WRONG - Do NOT do this
for (const [, transport] of transports) {
  try {
    await transport.handlePostMessage(req, res, body);
    return;
  } catch { continue; }
}
```

**Correct Pattern:** Route to the specific session by `sessionId` query parameter:

```typescript
// ✅ CORRECT - Direct session lookup
const sessionId = url.searchParams.get("sessionId");
const session = sessions.get(sessionId);

if (session) {
  await session.transport.handlePostMessage(req, res, body);
} else {
  res.writeHead(404).end("Unknown session");
}
```

**Why This Matters:**
- ChatGPT tracks which SSE connection should receive which response
- Wrong session = response goes to connection ChatGPT isn't monitoring
- The response is generated and sent, but ChatGPT never sees it

---

## Server-Side Issues

### SSE Session Management Issues

**Symptoms**: MCP Inspector shows "Connection Error" or "Invalid session ID" errors. SSE connections establish but immediately close.

**Root Cause**: Custom session management conflicts with SSEServerTransport's internal session handling. The SDK uses URL query params (`?sessionId=xxx`) for sessions, not headers.

**Common Mistakes**:

1. **Using separate endpoints for GET and POST**:
   ```typescript
   // WRONG: Separate paths cause session mismatch with proxies
   const ssePath = "/mcp";
   const postPath = "/mcp/messages";
   ```

2. **Custom header-based session validation**:
   ```typescript
   // WRONG: SSEServerTransport doesn't use headers for sessions
   const sessionId = req.headers["mcp-session-id"];
   const transport = transports.get(sessionId);
   if (!transport) {
     res.writeHead(400).end("Invalid session");
   }
   ```

**Correct Pattern**:

```typescript
// Session storage
const sessions = new Map<string, { server: Server; transport: SSEServerTransport }>();

// GET /mcp - SSE connection
if (url.pathname === "/mcp" && req.method === "GET") {
  const server = createMcpServer();
  const transport = new SSEServerTransport("/mcp", res);

  // Store session AFTER transport is created (sessionId is available immediately)
  sessions.set(transport.sessionId, { server, transport });

  // Clean up on disconnect
  res.on("close", () => sessions.delete(transport.sessionId));

  await server.connect(transport);
}

// POST /mcp - Message handling
if (url.pathname === "/mcp" && req.method === "POST") {
  // Get sessionId from query parameter (ChatGPT sends this)
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId");
    return;
  }

  // Direct lookup - DO NOT iterate through all sessions!
  const session = sessions.get(sessionId);

  if (session) {
    await session.transport.handlePostMessage(req, res);
  } else {
    res.writeHead(404).end("Unknown session");
  }
}
```

**Key Points**:
- Route POSTs to the **specific session** matching the `sessionId` query parameter
- **NEVER iterate through sessions** - this causes the multi-connection bug
- Store sessions by their transport's `sessionId` property
- Clean up sessions on SSE disconnect to prevent memory leaks

---

### "No tools listed" in ChatGPT connector

**Symptoms**: When creating a connector, the tools list is empty.

**Solutions**:
1. Verify server is running and accessible
2. Check that your MCP endpoint URL is correct (should be `/mcp`, not `/`)
3. Test with MCP Inspector:
   ```bash
   npx @modelcontextprotocol/inspector@latest http://localhost:8000/mcp
   ```
4. Check server logs for connection errors
5. Ensure CORS headers are present:
   ```typescript
   res.setHeader("Access-Control-Allow-Origin", "*");
   ```

---

### "Structured content only, no component"

**Symptoms**: Tool returns data but widget doesn't render. ChatGPT shows text fallback instead of widget UI.

**Root Cause**: Missing or incomplete `_meta` in resource definitions. ChatGPT requires specific metadata on BOTH the resource listing AND the resource contents.

**Solutions**:

1. **Add `_meta` to ListResourcesRequestSchema response**:
   ```typescript
   server.setRequestHandler(ListResourcesRequestSchema, async () => ({
     resources: [{
       uri: "ui://widget/app.html",
       name: "My Widget",
       mimeType: "text/html+skybridge",
       _meta: {
         "openai/outputTemplate": "ui://widget/app.html",
         "openai/widgetAccessible": true,
       },
     }],
   }));
   ```

2. **Add full `_meta` to ReadResourceRequestSchema response**:
   ```typescript
   server.setRequestHandler(ReadResourceRequestSchema, async (request) => ({
     contents: [{
       uri: request.params.uri,
       mimeType: "text/html+skybridge",
       text: widgetHtml,
       _meta: {
         "openai/outputTemplate": "ui://widget/app.html",
         "openai/widgetAccessible": true,
         "openai/widgetPrefersBorder": true,
         "openai/widgetCSP": {
           connect_domains: [],  // Add external API domains here
           resource_domains: [],
         },
         "openai/widgetDomain": "your-app.fly.dev",
       },
     }],
   }));
   ```

3. **Ensure tool response also has `_meta`**:
   ```typescript
   return {
     content: [{ type: "text", text: "Summary" }],
     structuredContent: { /* data */ },
     _meta: {
       "openai/outputTemplate": "ui://widget/app.html",
       "openai/widgetAccessible": true,
     },
   };
   ```

**Key Fields**:
- `openai/outputTemplate` - Links response to widget resource
- `openai/widgetAccessible` - Allows widget to call tools
- `openai/widgetCSP` - Security policy for external connections
- `openai/widgetDomain` - Your app's domain (required for submission)

---

### Widget Changes Not Taking Effect

**Symptoms**: After updating resource metadata (CSP, domain, etc.), widget still doesn't render or shows old behavior.

**Root Cause**: ChatGPT caches widget templates when the connector is first created. Changes to resource metadata don't take effect until cache is cleared.

**Solution**: Delete and recreate the connector:
1. Go to ChatGPT Settings → Connected Apps
2. Delete your connector
3. Add it again with the same MCP endpoint URL

This forces ChatGPT to re-fetch and cache the updated widget template.

---

## Widget Rendering Issues

### Widget Doesn't Load

**Symptoms**: Widget area is blank or shows error.

**Solutions**:
1. Check browser console for errors:
   - CSP violations (see CSP section below)
   - JavaScript syntax errors
   - Missing dependencies
2. Verify widget HTML is valid:
   ```bash
   npm run build:widget
   ```
3. Ensure all JavaScript is inlined in the HTML (no external script tags)
4. Check that React is bundled correctly (no missing imports)

---

### window.openai API Errors

**Symptoms**: Console shows `TypeError: window.openai.notifyIntrinsicHeight is not a function` or similar errors for other `window.openai` methods.

**Root Cause**: The `window.openai` API may not be fully initialized when the widget first renders, or certain functions may not be available in all contexts (e.g., during development vs. production).

**Solutions**:

1. **Use explicit type checks** (not just truthiness):
   ```typescript
   // WRONG: May pass if property exists but isn't callable
   if (window.openai?.notifyIntrinsicHeight) { ... }

   // CORRECT: Explicitly check it's a function
   if (typeof window.openai?.notifyIntrinsicHeight === "function") {
     window.openai.notifyIntrinsicHeight(height);
   }
   ```

2. **Add try-catch for safety**:
   ```typescript
   try {
     if (typeof window.openai?.notifyIntrinsicHeight === "function") {
       window.openai.notifyIntrinsicHeight(containerRef.current.scrollHeight);
     }
   } catch (err) {
     console.warn("notifyIntrinsicHeight failed:", err);
   }
   ```

3. **Delay initial call slightly** (for React useEffect):
   ```typescript
   useEffect(() => {
     const timer = setTimeout(() => {
       if (typeof window.openai?.notifyIntrinsicHeight === "function") {
         window.openai.notifyIntrinsicHeight(height);
       }
     }, 100);
     return () => clearTimeout(timer);
   }, []);
   ```

---

### Widget Data Not Loading - toolInput vs toolOutput

**Symptoms**: Widget shows "Loading..." or debug info showing `hasToolOutput: false`.

**Root Cause**: Confusion about where data is located in `window.openai`.

**Key Distinction**:
- `window.openai.toolInput` - The arguments ChatGPT passed TO the tool (the JSON input)
- `window.openai.toolOutput` - The `structuredContent` from the tool's response
- `window.openai.toolResponseMetadata` - The `_meta` from the tool's response

**For widgets that render tool input (like diagram generators)**:
```javascript
// The topology JSON that ChatGPT generated and passed to the tool
const topology = window.openai.toolInput;
```

**For widgets that render tool output (like data viewers)**:
```javascript
// The data returned by the tool
const data = window.openai.toolOutput;
```

---

### Widget UI Not Updating After Tool Calls

**Symptoms**: User clicks buttons in widget, server logs show tools are called successfully, but the widget UI doesn't update.

**Root Cause**: `window.openai.toolOutput` is set once when ChatGPT renders the widget. It's immutable for that widget instance.

**Solution**: Manage local React state and update it from tool call responses:

```typescript
export function App() {
  const output = useToolOutput<{ items: Item[] }>();
  const [items, setItems] = useState<Item[]>(output?.items || []);

  const handleDelete = async (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));

    try {
      const result = await window.openai.callTool("myapp_delete", { id });
      if (result?.structuredContent?.items) {
        setItems(result.structuredContent.items);
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };
}
```

---

## Response Size Issues

### Large Responses Fail to Deliver

**Symptoms**: Tool completes successfully but widget shows timeout or empty state. Works for small responses, fails for large ones.

**Root Cause**: Responses over ~300KB may fail to deliver completely.

**Solutions**:

1. **Remove duplicate data**:
   ```typescript
   // ❌ WRONG - Duplicates data
   return {
     structuredContent: { items: items.slice(0, 10) },
     _meta: { fullItems: items },  // Duplicates!
   };

   // ✅ CORRECT - No duplication
   return {
     structuredContent: { items: items.slice(0, 10) },
     _meta: { hasMore: items.length > 10 },
   };
   ```

2. **Log response sizes**:
   ```typescript
   const response = { content, structuredContent, _meta };
   const size = JSON.stringify(response).length;
   console.log(`Response size: ${(size / 1024).toFixed(1)}KB`);
   ```

---

## Widget Diagnostic Logging

When widgets timeout or show empty state, add diagnostic logging:

```javascript
function onTimeout() {
  console.log('Widget timeout diagnostic:', {
    hasToolOutput: !!window.openai?.toolOutput,
    toolOutputKeys: Object.keys(window.openai?.toolOutput || {}),
    hasToolInput: !!window.openai?.toolInput,
    toolInputKeys: Object.keys(window.openai?.toolInput || {}),
    hasToolResponseMetadata: !!window.openai?.toolResponseMetadata,
    theme: window.openai?.theme,
    displayMode: window.openai?.displayMode,
  });
}
```

**What to look for**:
- `hasToolOutput: false` + server logs show success = **session routing bug**
- `hasToolInput: true` but widget expects `toolOutput` = **wrong data source**
- `hasToolOutput: true` but wrong keys = **response structure mismatch**

---

## Debugging Tools

### MCP Inspector
```bash
npx @modelcontextprotocol/inspector@latest http://localhost:8000/mcp
```

### Browser Console
Open DevTools in ChatGPT to see widget errors and CSP violations.

### Server Logs
```typescript
console.log("Tool called:", name, "with args:", JSON.stringify(args));
```
