# Notes for Agent - ChatGPT Widget Not Rendering

## Problem
Diagrams don't display in ChatGPT Apps widget. ChatGPT shows ASCII art fallback instead of rendering the iframe widget.

## What Was Fixed (deployed to staging)

### 1. Connection Rendering Missing
**File:** `src/worker.ts` lines 246-321 (in `buildSvg()` function)

The widget's `buildSvg()` function was only rendering nodes (rectangles) but completely ignored the `connections` array. Added:
- Node position tracking map (`nodePos`)
- Connection line rendering with edge-to-edge routing
- Support for `solid`, `dashed`, `double` line styles
- Connection labels at midpoints

### 2. Relative URLs Changed to Absolute
**File:** `src/worker.ts` lines 388-467

The `buildUiMeta()` function was returning relative URLs (`/widget.html?data=...`). Changed to absolute URLs using request origin (`${origin}/widget.html?data=...`).

## What Still Doesn't Work

ChatGPT is NOT rendering the widget iframe. The response metadata shows correct data:
```
responseMetadata: {
  ui: { resourceUri: '/widget.html?data=...' },
  openai/outputTemplate: '/widget.html?data=...',
  openai/widgetUrl: '/widget.html?data=...'
}
```

But ChatGPT displays ASCII art instead of the widget.

## Possible Causes to Investigate

1. **OpenAI Apps SDK format mismatch** - The MCP response format may not match what ChatGPT expects for widget rendering. Check OpenAI's latest MCP widget documentation.

2. **Widget URL registration** - ChatGPT Apps may require the widget URL to be pre-registered in the connector configuration, not dynamically generated.

3. **Content Security Policy** - ChatGPT's iframe may be blocked from loading external URLs.

4. **MCP protocol version** - Current implementation uses `protocolVersion: "2024-11-05"`. May need update.

5. **Missing `_meta` fields** - OpenAI may expect different/additional metadata fields for widget rendering.

## Latest Apps SDK Notes (Feb 2026)

- OpenAI’s Apps SDK is still in preview and is built on MCP.
- The SDK is open source and intended for building ChatGPT apps and their UI widgets.
- Connecting a custom MCP server in ChatGPT requires Developer Mode in settings, then adding the server under Apps & Connectors.

## Key Files

| File | Purpose |
|------|---------|
| `src/worker.ts` | Cloudflare Worker with MCP endpoint and widget HTML |
| `src/mcp-server.ts` | Standalone MCP server (not used by worker) |
| `wrangler.jsonc` | Cloudflare deployment config |

## MCP Endpoint Structure

- `GET /mcp` - Returns server capabilities JSON
- `POST /mcp` - Handles JSON-RPC requests (tools/list, tools/call, etc.)
- `GET /widget.html` - Serves the widget HTML with embedded SVG renderer

## Test URLs

- **Staging:** https://staging.nwgrm.org
- **Widget direct:** https://staging.nwgrm.org/widget.html?data={encoded_topology_json}
- **MCP endpoint:** https://staging.nwgrm.org/mcp

## Next Steps

1. Research OpenAI Apps SDK documentation for correct widget rendering format
2. Check if ChatGPT requires widget URL in connector setup vs dynamic
3. Try using `ui://` protocol URIs instead of HTTP URLs
4. Test with OpenAI's example MCP servers that have working widgets
5. Consider using `resources/read` to serve widget HTML instead of direct URL
