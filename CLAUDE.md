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

### Local Skills

| Skill | Path | Purpose |
|-------|------|---------|
| **UI UX Pro Max** | `.claude/skills/ui-ux-pro-max/SKILL.md` | Design intelligence, typography, color palettes, accessibility |
| **iOS Simulator** | `.claude/skills/ios-simulator/SKILL.md` | iOS Simulator MCP tools for mobile testing |
| **Browser Automation** | `.claude/skills/browser-automation/SKILL.md` | Playwright MCP for ChatGPT web testing |

### Recommended External Skills

Install additional skills from these safe repositories:

| Repository | Install | Skills |
|------------|---------|--------|
| [anthropics/skills](https://github.com/anthropics/skills) | Official | PDF, DOCX, PPTX, XLSX |
| [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | Community | 127+ agents (QA, security, infra) |
| [lackeyjb/playwright-skill](https://github.com/lackeyjb/playwright-skill) | Community | Browser automation patterns |
| [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) | Hackathon winner | 43 skills, 13 agents, 31 commands |

```bash
# Install official Anthropic skills
claude mcp add anthropics/skills

# Install all skills from a collection
npx agent-skills-cli add alirezarezvani/claude-skills
```

## Issue Tracking

Issues and test cases are tracked separately from this file:

| File | Purpose |
|------|---------|
| `.claude/issues/BACKLOG.md` | Active issues with status and priority |
| `.claude/issues/TEST-CASES.md` | Test cases for each issue (written BEFORE dev) |
| `.claude/issues/CHANGELOG.md` | Completed work and release history |

### Issue Workflow

```
new → test-cases → ready → in-progress → review → CHANGELOG
        ↑                                    ↓
     QA Lead                              Tester
```

**Rule:** No implementation without test cases first.

---

## Sub-Agents

Specialized agent configurations for different workflows. The **Orchestrator** coordinates multi-agent workflows.

### Agent Roster

#### Orchestration & QA
| Agent | File | Purpose |
|-------|------|---------|
| **Orchestrator** | `.claude/agents/ORCHESTRATOR.md` | Coordinates multi-agent workflows, delegates tasks |
| **QA Lead** | `.claude/agents/QA-LEAD.md` | Defines test cases, reviews results, signs off |

#### Core Development
| Agent | File | Purpose |
|-------|------|---------|
| **Developer** | `.claude/agents/DEVELOPER.md` | Implementation with skills + web search |
| **Debugger** | `.claude/agents/DEBUGGER.md` | Runtime issue investigation, log analysis |
| **Deployer** | `.claude/agents/DEPLOYER.md` | Cloudflare Workers deployment, verification |

#### Quality & Testing
| Agent | File | Purpose |
|-------|------|---------|
| **Tester** | `.claude/agents/TESTER.md` | Manual QA in ChatGPT web interface |
| **Mobile Tester** | `.claude/agents/MOBILE-TESTER.md` | Testing at mobile breakpoints (375px+) |
| **Accessibility** | `.claude/agents/ACCESSIBILITY.md` | WCAG 2.1 AA compliance, screen readers |

#### Design & UX
| Agent | File | Purpose |
|-------|------|---------|
| **UX Auditor** | `.claude/agents/UX-AUDITOR.md` | Usability heuristics, experience review |
| **Visual Design** | `.claude/agents/VISUAL-DESIGN.md` | Typography scales, icon sizing, visual consistency |
| **Responsive Design** | `.claude/agents/RESPONSIVE-DESIGN.md` | Fluid layouts, breakpoint fixes |
| **Touch Interaction** | `.claude/agents/TOUCH-INTERACTION.md` | Touch events, gesture handling |
| **Share Integration** | `.claude/agents/SHARE-INTEGRATION.md` | Web Share API, save/export UX, sandbox workarounds |

### Using Agents with Task Tool

```bash
# Single agent invocation
Task: "Read .claude/agents/DEVELOPER.md. Implement dark mode toggle in toolbar."

# Orchestrated workflow (complex tasks)
Task: "Read .claude/agents/ORCHESTRATOR.md. Coordinate a full release: implement feature, test on desktop and mobile, deploy to staging."

# Parallel agent invocation (multiple Task calls in one message)
Task: "Read .claude/agents/MOBILE-TESTER.md. Test widget at 375px viewport."
Task: "Read .claude/agents/ACCESSIBILITY.md. Run WCAG audit on the widget."
```

### Common Workflows

#### Feature Development
```
Developer → Tester → Mobile Tester → Accessibility → Deployer
```

#### Bug Fix
```
Debugger → Developer → Tester → Deployer
```

#### Release
```
Deployer (pre-checks) → Deployer (staging) → Tester → Mobile Tester → Deployer (production)
```

#### Usability Review (Parallel)
```
┌─ UX Auditor
├─ Mobile Tester
├─ Accessibility
└─ Responsive Design
→ Aggregate findings
```

### Agent Decision Matrix

| Task Type | Primary Agent | Support Agents |
|-----------|---------------|----------------|
| New feature | Developer | Tester, Deployer |
| Bug fix | Debugger → Developer | Tester |
| Mobile issue | Mobile Tester | Touch Interaction, Developer |
| Accessibility | Accessibility | Developer |
| UX improvement | UX Auditor | Developer |
| Layout issue | Responsive Design | Developer |
| Typography/sizing | Visual Design | Developer, UX Auditor |
| Save/export UX | Share Integration | Developer, Mobile Tester |
| Deployment | Deployer | Tester |
| Incident | Debugger → Deployer | Developer |
| Security audit | Security Agent | - |
| Issue review | Orchestrator | QA Lead |

### MANDATORY: Agent Delegation Rules

**DO NOT rush to do tasks yourself. ALWAYS delegate to specialized agents.**

#### You MUST use subagents for:

| Task | Required Agent | Why |
|------|----------------|-----|
| **Any testing** | Tester / Mobile Tester | They follow TESTER.md workflow with proper connector refresh |
| **Browser automation** | Tester | Has Playwright skills and ChatGPT UI knowledge |
| **Mobile testing** | Mobile Tester | Proper viewport setup, touch emulation |
| **Writing test cases** | QA Lead | Follows test case format in TEST-CASES.md |
| **Implementation** | Developer | Reads skills, follows patterns |
| **Deployment** | Deployer | Knows staging vs production, verification steps |
| **Multiple issues** | Orchestrator | Coordinates parallel workflows |
| **Security checks** | Security Agent | Comprehensive audit patterns |
| **Connector refresh** | Tester | Full delete/recreate workflow |
| **Font/icon sizing** | Visual Design | Typography scales, cross-renderer consistency |
| **Save/share features** | Share Integration | Web Share API, sandbox workarounds |

#### Self-check before acting:

```
Before doing ANY task, ask yourself:
1. Is there a specialized agent for this? → Use it
2. Does it involve browser/testing? → Use Tester
3. Does it involve multiple steps? → Use Orchestrator
4. Am I about to write code? → Use Developer
5. Am I about to deploy? → Use Deployer
```

#### Anti-patterns (DO NOT):

- ❌ Directly using Playwright without Tester agent
- ❌ Writing code without Developer agent for non-trivial changes
- ❌ Testing without proper connector refresh workflow
- ❌ Deploying without Deployer agent
- ❌ Handling multiple issues without Orchestrator

#### Correct pattern:

```bash
# Instead of doing it yourself:
Task: "Read .claude/agents/TESTER.md. Test v45 with full connector refresh workflow."

# Instead of manual browser testing:
Task: "Read .claude/agents/MOBILE-TESTER.md. Test at 375px with touch emulation."

# Instead of fixing multiple issues yourself:
Task: "Read .claude/agents/ORCHESTRATOR.md. Review and fix all open issues in BACKLOG.md."
```

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

## Current Status

**v59 DEPLOYED TO PRODUCTION** - Performance and stability fixes.

### v59 Fixes (2026-02-25)

| Issue | Fix |
|-------|-----|
| PERF-001 | Throttled drag rendering - `throttledRender()` for smooth 30fps+ drag |
| BUG-002 | Fixed icon jumping - consistent 1600×900 viewBox dimensions |

**v58 reverted:** Render deduplication via `JSON.stringify(topology)` caused icon collapse regression.

**Key insight:** Layout calculations must use consistent dimensions across renderSVG, attachEventHandlers, and drag handlers.

### v54 Features (2026-02-25)

| Feature | Description |
|---------|-------------|
| Clean loading UX | Show status messages during streaming instead of partial diagram |
| Loading stages | "Connecting..." → "Generating topology..." → "Drawing diagram..." |
| Complete rendering | Only render SVG when `toolOutput` (complete data) is available |

### v46 Fixes (2026-02-23)

| Issue | Fix |
|-------|-----|
| IOS-001 | Accept header injection - iOS sends incomplete Accept header |
| IOS-002 | JSON response mode - SSE streaming issues on iOS |
| IOS-003 | readOnlyHint annotation - THE KEY FIX for "write action disabled" error |

**Key insight:** ChatGPT iOS blocks MCP tools by default as "write actions". Add `annotations: { readOnlyHint: true }` to mark tools as read-only.

### v45 Fixes (2026-02-23)

| Issue | Fix |
|-------|-----|
| MOB-004 | Drag handler scale bug - was using `1600*scale`, now uses fixed `1600` |
| MOB-005 | Save modal PNG conversion - SVG converted to PNG for reliable mobile save |

### v44 Features (2026-02-23)

| Issue | Fix |
|-------|-----|
| MOB-002 | Toolbar buttons now ≥ 44x44px touch targets |
| MOB-003 | Touch-friendly save modal ("Long-press" hint for touch devices) |
| UX-004 | Nodes constrained within SVG viewBox (can't drag off-screen) |

**Key insight:** ChatGPT caches widget HTML aggressively. **DELETE and RE-CREATE** connector to get fresh code (Refresh button alone may not work).

### Save/Export Feature (v45 Final Solution)

- **SVG→PNG conversion**: More reliable for mobile long-press save
- **Touch detection**: Shows "Long-press to save" on touch, "Right-click" on desktop
- **Filename**: Derived from `topology.solutionTitle`

### Key Learning (Mobile):
- SVG data URIs don't work well with mobile long-press save gesture
- PNG via canvas works reliably for mobile save
- Drag handlers must use fixed viewBox dimensions (1600×900), not scaled values

### Previous Fix (v31): Connection Rendering
The root cause was ChatGPT streaming JSON incrementally. Previous versions rendered too early before all connections arrived.

**v31 Solution:**
1. Track connection count across renders
2. Only render connections when count has been **stable for 3+ consecutive checks**
3. Retry mechanism polls every 400ms to detect new connections arriving

### Key Learning (Connections):
- **Don't rely on event timing** - `tool-result` event doesn't always fire reliably
- **Use stability counting** - wait until connection count stops changing (stable for 3+ checks)
- **Polling/retry is essential** - new connections arrive asynchronously during streaming

## Widget Version History

- **v59: (PRODUCTION)** ✅ Throttled drag, fixed icon jumping (reverted v58 render dedup)
- **v58:** ❌ Render deduplication caused icon collapse
- **v54:** ✅ Clean loading UX - messages during streaming, render only when complete
- **v53:** ✅ Use toolOutput (connections visible)
- **v52:** ✅ Extended polling 25s
- **v51:** ❌ 67% failure
- **v50:** ❌ 67% failure
- **v46:** ✅ iOS MCP fixes
- **v45:** ✅ Mobile fixes
- v44: ✅ Touch targets 44px, touch hints, drag bounds
- v41: ✅ Modal approach for Save
- v38: ✅ P1 features - Undo/Redo, Keyboard shortcuts, Touch drag, Accessibility
- v37: ✅ Save modal with filename label from diagram title
- v36: Clean modal (no text instructions), X close button, tooltip hint
- v35: Modal with data URI image for right-click save (sandbox workaround)
- v34: Clipboard copy attempt (BLOCKED by Permissions Policy)
- v33: DOM anchor download attempt (BLOCKED by sandbox)
- v32: Direct blob download attempt (BLOCKED - no `allow-downloads`)
- v31: ✅ Stability-based connection rendering + removed editUrl
- v30: Stability check in renderSVG (FAILED - shortcut bypassed wait)
- v29: Stability check in tool-result handler only (FAILED)
- v28: Data completeness checking (PARTIAL - rendered too early)
- v27: Event-based connection rendering (FAILED)
- v26: Add openai/outputTemplate and openai/widgetAccessible
- v24-25: Include topology in structuredContent
- v22: Improved topology validation, defensive array checks
- v21: Dark mode, system fonts, notifyIntrinsicHeight
- v20: Initial ChatGPT widget with toolInput support

## Technical Notes - Streaming and Stability-Based Rendering

**Key insight from v31:**

ChatGPT streams JSON incrementally. During streaming, `toolInput.connections` grows over time:
```javascript
// Time 0: First connection arrives
connections: [{from: "hq", to: "router1"}]  // count=1

// Time 1: More connections streaming
connections: [{...}, {from: "router1", to: "firewall"}]  // count=2

// Time 2: All connections arrived
connections: [{...}, {...}, {...}, {...}]  // count=4 (final)
```

**Problem with v28-v30:** Checking if connections are "valid" (have from/to) doesn't tell you if ALL connections have arrived. You might have 2 valid connections when 4 are coming.

**Solution: Stability-based rendering (v31)**

1. Widget renders **nodes immediately** during streaming (good UX)
2. Track connection **count** across renders
3. Only render connections when count is **stable for 3+ consecutive checks**
4. Retry every 400ms to detect new connections arriving

```javascript
// Track stability
if (currentConnCount === lastConnectionCount && currentConnCount > 0) {
  connectionCountStableFor++;
} else {
  connectionCountStableFor = 0;
  lastConnectionCount = currentConnCount;
}

// Only render when stable OR tool-result received
const shouldRenderConnections = toolResultReceived || connectionCountStableFor >= 3;

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

## Technical Notes - iOS MCP Compatibility

**Key fixes for ChatGPT iOS app (2026-02-23):**

ChatGPT on iOS has different behavior than the web version. Three fixes were required:

### 1. Accept Header Injection (lines 1343-1357)

**Problem:** ChatGPT iOS sends `Accept: application/json` only, but MCP SDK requires both `application/json` AND `text/event-stream`. Without both, SDK returns HTTP 406.

**Fix:** Inject the missing header before passing request to SDK:
```typescript
const acceptHeader = request.headers.get("accept") || "";
if (!acceptHeader.includes("text/event-stream")) {
  const fixedHeaders = new Headers(request.headers);
  fixedHeaders.set("accept", "application/json, text/event-stream");
  // ... create new request with fixed headers
}
```

### 2. JSON Response Mode (lines 1361-1363)

**Problem:** SSE (Server-Sent Events) streaming may cause issues on iOS.

**Fix:** Enable plain JSON response mode:
```typescript
const transport = new WebStandardStreamableHTTPServerTransport({
  enableJsonResponse: true,
});
```

### 3. readOnlyHint Annotation (lines 1204-1206) - THE KEY FIX

**Problem:** ChatGPT was blocking our tool with "MCP write action is temporarily disabled" error. Tools default to being considered "write" actions.

**Fix:** Mark tool as read-only with annotation:
```typescript
annotations: {
  readOnlyHint: true,  // Marks tool as read-only, not a "write action"
},
```

**This was THE critical fix that made MCP work on iOS.**

### Key Learning (iOS)

- ChatGPT iOS treats MCP tools as "write actions" by default (blocked)
- Must explicitly mark read-only tools with `readOnlyHint: true`
- Accept header differences between iOS and web require server-side fix
- JSON response mode is more reliable than SSE on mobile

---

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
