# ChatGPT MCP Integration - Session Summary

## Status: Working with Interactive Canvas

The MCP server is deployed and functional at `https://staging.nwgrm.org/mcp`

## What Was Done

### 1. Interactive Canvas Widget (v20)

Replaced static SVG with a fully interactive canvas inside ChatGPT:

| Feature | Description |
|---------|-------------|
| **Drag nodes** | Click and drag any node to reposition |
| **Edit labels** | Double-click node labels, params, or connection labels to edit inline |
| **Zoom controls** | `+`/`-` buttons redraw icons and fonts at new scale (0.7x to 1.8x) |
| **SVG export** | Download button shows modal with blob URL download link |
| **Edit mode toggle** | Switch between view and edit modes |

### 2. Data Loading from ChatGPT

The widget loads topology from `window.openai.toolInput` - the JSON that ChatGPT generates and passes to the MCP tool.

```
ChatGPT generates topology JSON
    ↓
Calls generate_network_diagram tool with JSON
    ↓
Widget reads from window.openai.toolInput
    ↓
Renders interactive canvas
```

### 3. URL Parameter Support (App.jsx)

Added support for loading topology via URL parameter:

```
https://staging.nwgrm.org/?topology=<base64-encoded-json>
```

- Automatically decodes and loads the topology
- Enables edit mode by default
- Cleans URL after loading (removes base64 from address bar)

### 4. Code Architecture

| File | Purpose |
|------|---------|
| `src/cors.ts` | Shared CORS utilities |
| `src/schemas.ts` | Zod schemas with validation and limits |
| `src/mcp-server.ts` | MCP server with interactive widget HTML (~600 lines) |
| `src/svg-renderer.ts` | Pure TypeScript SVG renderer (for static fallback) |
| `src/worker.ts` | Cloudflare Worker with `/mcp` and `/render` endpoints |
| `src/App.jsx` | React app with URL param loading |

### 5. Widget Technical Details

The widget is pure vanilla JavaScript (no React) embedded in the MCP server:

- **No ES6 modules**: Uses `<script>` not `<script type="module">`
- **All `var` declarations**: Avoids `const`/`let` for maximum compatibility
- **No optional chaining**: Uses explicit null checks instead of `?.`
- **DOM-based modals**: Avoids innerHTML with complex escaping
- **Sandboxed iframe compatible**: No `alert()`, `window.open()`, or downloads

### 6. Zoom Implementation

Zoom works by re-rendering the SVG with scaled elements:

```javascript
// Fixed viewBox (1600x900), scaled elements inside
var w = 1600, h = 900;
var s = scale;  // 0.7 to 1.8
var layout = computeLayout(topology, w, h, s);
// Icons: 70*s x 53*s
// Fonts: 14*s px for labels, 11*s px for params
```

## Deployment

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy
```

**Staging URL**: https://staging.nwgrm.org
**MCP Endpoint**: https://staging.nwgrm.org/mcp

## Connecting to ChatGPT

1. Enable developer mode: **Settings → Apps & Connectors → Advanced settings**
2. Create connector: **Settings → Connectors** with URL `https://staging.nwgrm.org/mcp`
3. Add to conversation via the **More** menu
4. Ask ChatGPT to generate a network diagram
5. Use the interactive canvas to edit, then export

## Git

- **Branch**: `chatgpt-image-app`
- **Latest commit**: `6fd0873` - Add interactive canvas to ChatGPT MCP widget
- **Remote**: Pushed to `origin/chatgpt-image-app`

## Widget Toolbar

```
┌─────────────────────────────────────────────────────┐
│ [✎ Edit]  [−] [+]  [↓ Export]    Drag · Double-click │
├─────────────────────────────────────────────────────┤
│                                                     │
│              Network Topology Diagram               │
│                                                     │
│    [Customer]  ──────  [Operator]  ──────  [Cloud]  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Troubleshooting

### Widget shows "Looking for topology data"
- Reconnect the ChatGPT connector (Settings → Connectors → Disconnect → Add again)

### Zoom buttons don't work
- Check console for JavaScript errors
- Ensure widget version is v20 or later

### Export shows empty download
- Check console for "SVG data length" and "Blob URL created" logs
- Try a smaller diagram
