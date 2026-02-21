# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Required Skills

**MANDATORY**: When working on ChatGPT Apps integration, MCP server, or widget development, you MUST first read and apply the ChatGPT App Builder skill:

```
.claude/skills/chatgpt-app-builder/SKILL.md
```

Key reference files for troubleshooting:
- `.claude/skills/chatgpt-app-builder/references/troubleshooting.md` - Common issues and solutions
- `.claude/skills/chatgpt-app-builder/references/widget_development.md` - Widget API and patterns
- `.claude/skills/chatgpt-app-builder/references/node_chatgpt_app.md` - Server implementation patterns

## Sub-Agents

Specialized agent configurations for different workflows:

| Agent | File | Purpose |
|-------|------|---------|
| **Tester** | `.claude/agents/TESTER.md` | Manual QA testing in ChatGPT web interface |
| **Developer** | `.claude/agents/DEVELOPER.md` | Implementation with skills + web search |

### Using Agents with Task Tool

```
# Spawn a Tester agent
Task: "Act as TESTER agent. Read .claude/agents/TESTER.md and test the current widget in ChatGPT. Report any issues with connections rendering."

# Spawn a Developer agent
Task: "Act as DEVELOPER agent. Read .claude/agents/DEVELOPER.md. Search web for 'MCP protocol widget streaming 2026' and implement fix for connections not rendering."
```

### Agent Capabilities

**Tester Agent:**
- Tests widgets in ChatGPT web interface
- Follows Phase 4 testing checklist from skill
- Reports bugs with reproduction steps
- Uses browser console for debugging

**Developer Agent:**
- Implements MCP server and widget code
- Searches web for current documentation (2026)
- Applies security patterns from skill references
- Runs tests and deploys to staging

## Build & Development Commands

```bash
npm install         # Install dependencies
npm run dev         # Start dev server on port 3000
npm run build       # Production build to /dist
npm run preview     # Preview production build
npm test            # Run tests in watch mode
npm run test:run    # Run tests once
npm run typecheck   # TypeScript type checking
```

## Testing

**Framework:** Vitest (compatible with Vite)

**Test files:**
| File | Purpose |
|------|---------|
| `src/schemas.test.ts` | Zod schema validation (27 tests) |
| `src/svg-renderer.test.ts` | SVG rendering output (13 tests) |
| `src/test-fixtures.ts` | Shared test data (minimal/full topologies) |

**Run tests before making changes:**
```bash
npm run test:run && npm run typecheck
```

**Test fixtures available:**
- `minimalTopology` - Simplest valid topology (1 node per zone)
- `fullTopology` - Complete topology with all features (counts, params, styles)
- `invalidTopologies` - Collection of invalid inputs for validation testing

**Known issues found by tests:**
- Zod v4 uses `error.issues` not `error.errors` (fixed in schemas.ts)

## Next Session Init Procedure

**MANDATORY** - Run these steps at the start of every session:

1. **Read the skill**: `.claude/skills/chatgpt-app-builder/SKILL.md`
2. **Run tests**: `npm run test:run && npm run typecheck`
3. **Review current issue** (if any): See "Current Issue" section below

## Current Issue

**Testing v27** - Awaiting tester verification.

v27 implements event-based connection rendering:
- Nodes render immediately during streaming (good UX)
- Connections only render AFTER `ui/notifications/tool-result` event fires
- This solves the incomplete connections issue during JSON streaming

## Widget Version History

- v27: (CURRENT) Event-based connection rendering - nodes show immediately, connections after tool-result
- v26: Add openai/outputTemplate and openai/widgetAccessible to response _meta
- v24-25: Include topology in structuredContent so toolOutput.topology has complete validated data
- v23: Attempted toolOutput.topology fix - FAILED because server didn't include topology in structuredContent
- v22: Improved topology validation, defensive array checks, debug logging
- v21: Dark mode, system fonts, notifyIntrinsicHeight, loading guard
- v20: Initial ChatGPT widget with toolInput support

## Technical Notes - Streaming and Event-Based Rendering

**Key insight from v27:**

ChatGPT streams JSON properties one at a time. During streaming, `toolInput.connections` may be incomplete:
```javascript
connections: [{from: "hq1"}]  // incomplete - missing "to" field
```

**Solution: Event-based connection gating**

1. Widget renders **nodes immediately** during streaming (good UX - user sees progress)
2. Widget **skips connections** until `ui/notifications/tool-result` event fires
3. After tool-result, `toolInput` is complete, so connections render correctly

```javascript
let toolResultReceived = false;

// In renderSVG():
if (toolResultReceived) {
  // Render connections - data is complete
} else {
  // Skip connections - still streaming
}

// On tool-result notification:
window.addEventListener('message', (event) => {
  if (event.data?.method === 'ui/notifications/tool-result') {
    toolResultReceived = true;
    renderSVG(); // Re-render with connections
  }
});
```

**Data sources:**
- `window.openai.toolInput` = Arguments ChatGPT sends TO the tool (complete after tool-result)
- `window.openai.toolOutput` = The `structuredContent` from the tool's response (backup)

## Architecture Overview

Network Topology Agent is a single-page React application that converts natural language descriptions of B2B telecom solutions into editable Cisco-style network diagrams.

**Data Flow:**
```
User Input → LLM Processing → JSON Schema → SVG Renderer → Editable Diagram → SVG Export
```

**Three-Zone Topology Model:**
- **Customer Premises** (left): Office buildings, branches, remote workers
- **Operator Network Cloud** (center): Telecom infrastructure with ingress/core/egress sub-zones
- **External Services** (right): AWS, Azure, SaaS, internet

## Code Structure

The entire application lives in `src/App.jsx` (~700 lines) with these key modules:

| Module | Purpose |
|--------|---------|
| `PROVIDERS` | LLM provider abstraction (Anthropic, OpenAI, Azure, Gemini, Custom) |
| `SYSTEM_PROMPT` | LLM instructions defining JSON output schema and 23 icon types |
| `CI` | Cisco-style icon components (SVG React components) |
| `TH` | Light/dark theme color palettes |
| `EXAMPLES` | Pre-built demo topologies |
| `Topo` | Main SVG topology renderer with drag-to-edit and inline text editing |

## Key Implementation Details

- **SVG Rendering:** Pure React SVG components, no charting libraries
- **Drag Mechanics:** Uses `getScreenCTM()` for accurate SVG coordinate transformation
- **Inline Editing:** `foreignObject` elements with contentEditable for text editing
- **Connection Routing:** Smart path calculation (straight, vertical, or curved paths)
- **LLM Integration:** Standardized interface across 5+ providers with JSON extraction from responses

## Demo Mode

Three pre-built examples available without API key: Bank SD-WAN, 5G Manufacturing, AI Startup. Activated via toggle in settings panel.

## Cloudflare Workers Deployment

The app is deployed to Cloudflare Workers with a proxy layer to handle CORS restrictions.

**Deployment commands:**
```bash
npm run build && npx wrangler deploy
```

**Live URL:** https://nwgrm.org

**Configuration:** `wrangler.jsonc` defines the Worker entry point and static assets binding.

## API Proxy Architecture

Browser-based apps cannot call LLM APIs directly due to CORS. The Worker (`src/worker.ts`) proxies requests:

| Frontend Endpoint | Proxies To |
|-------------------|------------|
| `/api/anthropic` | `api.anthropic.com/v1/messages` |
| `/api/openai` | `api.openai.com/v1/chat/completions` |
| `/api/gemini/:model` | `generativelanguage.googleapis.com/v1beta/models/:model` |

**Anthropic API Key Fallback:**
- If user provides a key in the UI → uses that key
- If no key provided → falls back to `ANTHROPIC_API_KEY` Cloudflare secret
- Set the secret: `npx wrangler secret put ANTHROPIC_API_KEY`

**Debug logging:** The worker logs API key source (user-provided, env-secret, or none). View with `npx wrangler tail`.

## ChatGPT Apps Integration (chatgpt-image-app branch)

Native ChatGPT integration using MCP protocol. ChatGPT generates topology JSON, the server renders it to SVG image.

**Staging URL:** https://staging.nwgrm.org

**MCP Endpoint:** https://staging.nwgrm.org/mcp

### Architecture

```
ChatGPT → generates topology JSON → calls render_topology tool → SVG image returned
```

### MCP Tool

| Tool | Description |
|------|-------------|
| `render_topology` | Render topology JSON to SVG image |

### Files

| File | Purpose |
|------|---------|
| `src/svg-renderer.ts` | Pure TypeScript SVG renderer (no React) |
| `src/mcp-server.ts` | MCP protocol handler with render_topology tool |
| `src/worker.ts` | Cloudflare Worker with `/mcp` endpoint |

### Connecting to ChatGPT

1. Enable developer mode in ChatGPT: **Settings → Apps & Connectors → Advanced settings**
2. Create connector: **Settings → Connectors** with URL `https://staging.nwgrm.org/mcp`
3. Add to conversation via the **More** menu
4. Ask ChatGPT to generate a topology - it will create the JSON and call the tool

### Testing MCP Endpoint

```bash
# Initialize
curl -X POST https://staging.nwgrm.org/mcp -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}'

# List tools
curl -X POST https://staging.nwgrm.org/mcp -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

### Deploy to Staging

```bash
npm run deploy:staging
```

## GitHub Repository

https://github.com/figlyn/network-topology-agent
