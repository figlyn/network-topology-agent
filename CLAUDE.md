# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install         # Install dependencies
npm run dev         # Start dev server on port 3000
npm run build       # Production build to /dist
npm run preview     # Preview production build
```

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

## GitHub Repository

https://github.com/figlyn/network-topology-agent
