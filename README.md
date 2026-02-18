# Network Topology Agent

AI-powered network topology diagram generator for B2B telecom proposals. Paste a solution description, get a professional Cisco-style network diagram — ready for proposal slides.

## Features

### Operator Cloud Model
The diagram uses a realistic three-zone architecture:
- **Customer Premises** (left) — sites, offices, branches, endpoints
- **Operator Network Cloud** (center) — rendered as a cloud with ingress/core/egress sub-zones
- **External Services** (right) — public clouds, internet, SaaS, partner networks

Connections cross the operator cloud boundary with visible ingress/egress points — exactly how real telco architects draw topology diagrams.

### Multi-LLM Support
Works with any major LLM provider:
| Provider | Auth | Notes |
|---|---|---|
| **Anthropic Claude** | API key | Claude Sonnet 4, Haiku |
| **OpenAI** | API key | GPT-4o, GPT-4o-mini, o3-mini |
| **Azure OpenAI** | Key + endpoint + deployment | Enterprise Azure deployments |
| **Google Gemini** | API key | Gemini 2.0 Flash, 1.5 Pro |
| **Custom / Local** | Endpoint URL | Any OpenAI-compatible API (Ollama, vLLM, LM Studio) |

### Interactive Editing
After generation, enter **Edit Mode** to customize:
- **Drag** any node to reposition it on the canvas
- **Double-click** any text to edit inline (labels, parameters, connection labels, title)
- **Click** to select nodes with visual highlight
- All edits are preserved in SVG export

### 23 Cisco-Style Icons
Professional SVG icons for: `hq_building`, `branch`, `small_site`, `factory`, `data_center`, `router`, `switch`, `firewall`, `cloud`, `saas`, `internet`, `mpls`, `wireless_ap`, `cell_tower`, `server`, `mec`, `iot_gateway`, `vpn`, `load_balancer`, `phone`, `security_cloud`, `sdwan`, `users`

### Light / Dark Themes
Toggle between light (white background for print/PDF) and dark (for screen presentations).

### SVG Export
Download as clean SVG file — ready to drop into PowerPoint, Google Slides, or any presentation tool.

### Demo Mode
Built-in example topologies work without any API key:
- **Bank SD-WAN** — 85-branch enterprise with MPLS + SD-WAN overlay
- **5G Manufacturing** — private 5G RAN with MEC edge compute
- **AI Startup** — multi-office with GPU cluster and multi-cloud

## Architecture

```
┌──────────────┐      ╭──────────────────────────────╮      ┌──────────────┐
│   CUSTOMER   │      │      OPERATOR NETWORK         │      │   EXTERNAL   │
│   PREMISES   │  ●   │                                │  ●   │   SERVICES   │
│              ├──┼──▶│  Ingress │ Core  │ Egress     │──┼──▶│              │
│  HQ, Branches│  │   │  Access  │ SASE  │ PE Router  │  │   │  AWS, Azure  │
│  Remote Users├──┼──▶│  VPN     │ SD-WAN│ Colo X-Con │──┼──▶│  SaaS, GPUs  │
│              │      │  RAN     │ FW    │            │      │  Internet    │
└──────────────┘      ╰──────────────────────────────╯      └──────────────┘
                  INGRESS                            EGRESS
```

```
User Input → LLM (extract & classify) → Structured JSON → React SVG Renderer → Editable Diagram → SVG Export
```

## Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/network-topology-agent.git
cd network-topology-agent

# Install
npm install

# Run
npm run dev
```

Open http://localhost:3000, configure your LLM provider, paste a solution description, and generate.

## Usage

1. **Configure LLM** — expand the provider panel, select your provider, enter API key
2. **Paste Solution** — paste the B2B solution description / quote text
3. **Generate** — click Generate; the LLM extracts topology and produces the diagram
4. **Edit** — click ✎ Edit to enter edit mode: drag nodes, double-click text to rename
5. **Export** — click ↓ SVG to download the diagram

### Input Format

The LLM is flexible, but best results come from structured descriptions:

```
Customer: Acme Corp
Industry: Manufacturing

Sites:
- HQ in Chicago (10Gbps, dual fiber)
- 50 branches (500Mbps each)
- 200 remote workers

Operator Network:
- SD-WAN managed overlay (core)
- SASE security (core)
- Access routers at PoPs (ingress)
- PE peering router (egress)

Cloud/External:
- Azure ExpressRoute
- AWS Direct Connect
- SAP S/4HANA SaaS
```

## Deployment

### Vercel (fastest)
```bash
npm run build
npx vercel
```

### Azure Static Web Apps
```bash
npm run build
az staticwebapp create --name topology-agent --source ./dist
```

### Docker
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

### API Key Security
For production deployment, add a backend proxy (15-line serverless function) to hide LLM API keys:

```javascript
// api/generate.js (Vercel/Azure Function)
export default async function handler(req, res) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(req.body)
  });
  const data = await response.json();
  res.json(data);
}
```

## Tech Stack

- **React 18** — functional components, hooks
- **Vite** — fast dev server and build
- **SVG** — all rendering is pure SVG (no chart libraries)
- **LLM APIs** — Anthropic, OpenAI, Azure OpenAI, Gemini, custom

## License

MIT
