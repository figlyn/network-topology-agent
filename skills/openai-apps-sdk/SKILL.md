# OpenAI Apps SDK & MCP Widget Integration

Reference guide for building ChatGPT Apps with MCP servers and interactive widgets.

## Architecture Overview

```
ChatGPT → MCP Server (tools/call) → Tool Result → Widget iframe (postMessage bridge)
```

- **MCP Server**: Defines tools, returns structured data + UI metadata
- **Widget**: HTML rendered in sandboxed iframe, receives data via postMessage
- **Bridge**: JSON-RPC 2.0 over `window.postMessage`

## Tool Response Structure

Tools return three sibling payloads:

```javascript
{
  // Model-visible summary (keep concise)
  content: [{ type: "text", text: "Generated topology for Bank Corp" }],

  // Structured data for model AND widget
  structuredContent: {
    topology: { /* ... */ }
  },

  // Widget-only data (hidden from model)
  _meta: {
    ui: {
      resourceUri: "ui://widget/template.html",
      state: { /* large payload here */ }
    },
    "openai/outputTemplate": "https://example.com/widget.html"
  }
}
```

### Key Fields

| Field | Visibility | Purpose |
|-------|-----------|---------|
| `content` | Model + Widget | Narration text for conversation |
| `structuredContent` | Model + Widget | Concise JSON for reasoning & rendering |
| `_meta` | Widget only | Large/sensitive data, UI configuration |
| `_meta.ui.resourceUri` | Widget | MCP Apps standard template reference |
| `_meta["openai/outputTemplate"]` | Widget | OpenAI compatibility alias |

## Widget Data Delivery (Critical)

ChatGPT delivers tool results via **postMessage**, NOT URL parameters.

### Correct Pattern

```javascript
window.addEventListener("message", (event) => {
  if (event.source !== window.parent) return;
  const msg = event.data;
  if (msg?.jsonrpc !== "2.0") return;

  // Tool result notification
  if (msg.method === "ui/notifications/tool-result") {
    const data = msg.params?.structuredContent;
    // Also check _meta for larger payloads
    const meta = msg.params?._meta;
    renderWidget(data, meta);
  }
});
```

### JSON-RPC Message Format

```json
{
  "jsonrpc": "2.0",
  "method": "ui/notifications/tool-result",
  "params": {
    "content": [...],
    "structuredContent": { "topology": {...} },
    "_meta": { "ui": {...} }
  }
}
```

## MCP Apps Bridge Methods

| Method | Direction | Purpose |
|--------|-----------|---------|
| `ui/initialize` | Host → Widget | Initialize widget, widget must respond |
| `ui/notifications/tool-input` | Host → Widget | Tool input parameters |
| `ui/notifications/tool-result` | Host → Widget | Tool execution result |
| `tools/call` | Widget → Host | Call MCP tool from widget |
| `ui/message` | Widget → Host | Post follow-up message |
| `ui/update-model-context` | Widget → Host | Update model-visible context |

## Widget Initialization

Widget MUST respond to `ui/initialize`:

```javascript
window.addEventListener("message", (event) => {
  const msg = event.data;

  // Respond to initialize request
  if (msg?.jsonrpc === "2.0" && msg.method === "ui/initialize" && msg.id != null) {
    window.parent.postMessage({
      jsonrpc: "2.0",
      id: msg.id,
      result: {}
    }, "*");
  }
});
```

## OpenAI-Specific APIs

Access via `window.openai` object:

```javascript
// Tool output (after tool execution)
window.openai.toolOutput      // { structuredContent, content, _meta }
window.openai.toolInput       // Tool input parameters

// Widget state (persists across turns)
window.openai.widgetState     // Read current state
window.openai.setWidgetState  // Update state

// Display modes
window.openai.displayMode     // 'inline' | 'fullscreen'
window.openai.requestDisplayMode({ mode: 'fullscreen' })

// External actions
window.openai.openExternal(url)           // Open URL in new tab
window.openai.sendFollowUpMessage(text)   // Send message to conversation
window.openai.callTool(name, args)        // Call another MCP tool
```

## Tool Descriptor with UI

```javascript
{
  name: "generate_topology",
  description: "Generate network topology diagram",
  inputSchema: { /* ... */ },
  _meta: {
    ui: { resourceUri: "ui://topology-widget/v1" },
    "openai/outputTemplate": "ui://topology-widget/v1"
  }
}
```

## Resource Serving

Resources must be served with correct MIME type:

```javascript
// For resources/read response
{
  contents: [{
    uri: "ui://widget/template.html",
    mimeType: "text/html;profile=mcp-app",
    text: "<!DOCTYPE html>..."
  }]
}

// For HTTP endpoint
headers: {
  "Content-Type": "text/html;profile=mcp-app"
}
```

## Common Issues & Fixes

### Widget Shows "Waiting for data"

**Cause**: Widget not receiving postMessage or not parsing correctly.

**Fix**:
1. Ensure widget responds to `ui/initialize`
2. Listen for `ui/notifications/tool-result`
3. Extract data from `msg.params.structuredContent`
4. Also check `window.openai.toolOutput` as fallback

### Widget Not Rendering

**Cause**: `_meta["openai/outputTemplate"]` missing or malformed.

**Fix**: Return clean template URL (not data-embedded URL):
```javascript
_meta: {
  "openai/outputTemplate": "https://staging.nwgrm.org/widget.html"
}
```

### Data Not in Widget

**Cause**: Data embedded in URL instead of using postMessage.

**Fix**: ChatGPT sends `structuredContent` via postMessage bridge. Don't rely on URL params for ChatGPT integration.

## Best Practices

1. **Separate data tools from render tools** - Data tools fetch/compute, render tools display
2. **Keep structuredContent concise** - Large data degrades model performance
3. **Use _meta for large payloads** - Hidden from model, delivered to widget
4. **Always respond to ui/initialize** - Required for proper widget lifecycle
5. **Test postMessage flow** - Log incoming messages during development

## References

- [Build your ChatGPT UI](https://developers.openai.com/apps-sdk/build/chatgpt-ui/)
- [Build your MCP server](https://developers.openai.com/apps-sdk/build/mcp-server/)
- [API Reference](https://developers.openai.com/apps-sdk/reference/)
- [MCP Apps Standard](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/)
- [Example Apps](https://github.com/openai/openai-apps-sdk-examples)
