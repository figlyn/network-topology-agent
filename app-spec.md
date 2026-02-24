# Network Gramm - ChatGPT App Specification

## Product Context

- **Name**: Network Gramm
- **URL**: https://nwgrm.org
- **MCP Endpoint**: https://nwgrm.org/mcp
- **Auth**: None (public tool)

## Product Description

Network Gramm is a professional network topology diagram generator. It creates Cisco-style network diagrams from natural language descriptions, perfect for B2B telecom solutions, enterprise networks, and cloud architectures.

## Value Proposition

| Pillar | Value |
|--------|-------|
| **Know** | N/A - Uses ChatGPT's existing knowledge |
| **Do** | Generates professional SVG network diagrams |
| **Show** | Interactive widget with drag-to-edit, zoom, and export capabilities |

## Tool Definition

### generate_network_diagram

**Purpose**: Generate professional Cisco-style network topology diagrams from natural language descriptions.

**Annotations**:
```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "openWorldHint": false
}
```

**Input Schema**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| solutionTitle | string | Yes | Short title for the diagram |
| customer | string | Yes | Customer/project name |
| industry | string | Yes | Industry vertical |
| customerNodes | array | Yes | Customer premises nodes (max 10) |
| operatorNodes | array | Yes | Operator network nodes (max 10) |
| externalNodes | array | Yes | External services (max 10) |
| connections | array | Yes | Connections between nodes (max 50) |

**Node Types**:
- Customer: hq_building, branch, small_site, factory, data_center, users, iot_gateway, phone
- Operator: router, switch, firewall, sdwan, security_cloud, vpn, cell_tower, mec, load_balancer, mpls, data_center, wireless_ap
- External: cloud, saas, internet, server, data_center

**Output**:
- `content`: Text confirmation of generation
- `structuredContent`: Complete topology JSON for widget rendering
- Widget: Interactive SVG diagram with Edit/Zoom/Save controls

## Widget Features

1. **Interactive Editing**: Drag nodes to reposition
2. **Inline Text Edit**: Double-click labels to edit
3. **Zoom Controls**: 70% - 180% zoom range
4. **Undo/Redo**: Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z
5. **Export**: Save as PNG image (mobile-friendly long-press save)
6. **Dark Mode**: Automatic theme detection
7. **Accessibility**: ARIA labels, keyboard navigation, screen reader support
8. **Touch Support**: Touch drag, 44px touch targets

## Golden Prompts

### Direct Prompts (should trigger tool)
1. "Create a network diagram showing headquarters connected to 3 branch offices through MPLS"
2. "Generate a topology for SD-WAN with AWS and Azure cloud connections"
3. "Build a network diagram for a manufacturing plant with IoT sensors"
4. "Draw a telecom network with ingress routers, core switches, and egress firewalls"
5. "Make a diagram showing data center connectivity to multiple cloud providers"

### Indirect Prompts (should trigger tool)
1. "I need to visualize our company's network architecture"
2. "Help me design a hub-and-spoke network for retail stores"
3. "Show me how to connect our offices to AWS"
4. "What would a 5G private network look like for a factory?"
5. "Illustrate a typical enterprise SD-WAN deployment"

### Negative Prompts (should NOT trigger tool)
1. "What is MPLS?" (informational, no diagram needed)
2. "Compare SD-WAN vendors" (comparison, not visualization)
3. "How do I configure a Cisco router?" (configuration help, not diagram)

## Technical Requirements

### Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/mcp` | POST | MCP protocol handler |
| `/health` | GET | Health check |
| `/privacy` | GET | Privacy policy |
| `/terms` | GET | Terms of service |
| `/.well-known/openai-apps-challenge` | GET | App verification |

### Security
- HTTPS only
- CORS configured for ChatGPT domains
- No user data stored
- No authentication required
- Input validation via Zod schemas

### Performance
- Response time: < 500ms for diagram generation
- Widget load: < 100ms
- SVG size: Typically 50-150KB

## Submission Checklist

- [x] Organization verified on OpenAI Platform
- [x] Tool has clear description
- [x] Annotations set (readOnlyHint: true)
- [x] No prohibited content
- [x] No restricted data collection
- [x] Widget renders on mobile (tested at 375px)
- [x] Privacy policy at /privacy
- [x] Terms of service at /terms
- [x] Health check at /health
- [x] Challenge endpoint at /.well-known/openai-apps-challenge
- [ ] Challenge token configured (set during submission)

## Contact

- **Website**: https://nwgrm.org
- **Email**: info@nwgrm.org
- **GitHub**: https://github.com/figlyn/network-topology-agent
