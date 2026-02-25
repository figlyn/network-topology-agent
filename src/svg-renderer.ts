// Pure SVG renderer for network topology (no React dependency)

// Re-export types from schemas for backward compatibility
export type { TopologyData, CustomerNode, OperatorNode, ExternalNode, Connection } from "./schemas";
import type { TopologyData, CustomerNode, OperatorNode, ExternalNode, Connection } from "./schemas";

// Combined node type for internal use
type TopologyNode = CustomerNode | OperatorNode | ExternalNode;

// Cisco-style icon paths (viewBox 0 0 48 36)
const ICONS: Record<string, string> = {
  hq_building: `<rect x="14" y="2" width="20" height="32" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="12" width="10" height="22" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="34" y="12" width="10" height="22" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="17" y="5" width="3" height="3" fill="currentColor" opacity="0.35"/><rect x="22" y="5" width="3" height="3" fill="currentColor" opacity="0.35"/><rect x="28" y="5" width="3" height="3" fill="currentColor" opacity="0.35"/><rect x="17" y="11" width="3" height="3" fill="currentColor" opacity="0.35"/><rect x="22" y="11" width="3" height="3" fill="currentColor" opacity="0.35"/><rect x="28" y="11" width="3" height="3" fill="currentColor" opacity="0.35"/><rect x="17" y="17" width="3" height="3" fill="currentColor" opacity="0.35"/><rect x="22" y="17" width="3" height="3" fill="currentColor" opacity="0.35"/><rect x="28" y="17" width="3" height="3" fill="currentColor" opacity="0.35"/><rect x="7" y="16" width="3" height="3" fill="currentColor" opacity="0.35"/><rect x="7" y="22" width="3" height="3" fill="currentColor" opacity="0.35"/><rect x="37" y="16" width="3" height="3" fill="currentColor" opacity="0.35"/><rect x="37" y="22" width="3" height="3" fill="currentColor" opacity="0.35"/><rect x="21" y="27" width="6" height="7" rx="1" fill="currentColor" opacity="0.25"/>`,
  branch: `<rect x="6" y="8" width="36" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="4" y1="8" x2="44" y2="8" stroke="currentColor" stroke-width="2"/><rect x="10" y="13" width="5" height="5" fill="currentColor" opacity="0.25"/><rect x="18" y="13" width="5" height="5" fill="currentColor" opacity="0.25"/><rect x="26" y="13" width="5" height="5" fill="currentColor" opacity="0.25"/><rect x="34" y="13" width="5" height="5" fill="currentColor" opacity="0.25"/><rect x="20" y="22" width="8" height="8" rx="1" fill="currentColor" opacity="0.2"/>`,
  small_site: `<rect x="10" y="10" width="28" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="8" y1="10" x2="40" y2="10" stroke="currentColor" stroke-width="2"/><rect x="17" y="14" width="14" height="8" rx="1" fill="currentColor" opacity="0.15"/>`,
  factory: `<rect x="4" y="14" width="36" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><polyline points="4,14 4,6 16,14 16,6 28,14 28,6 40,14" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="34" y="2" width="4" height="12" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  data_center: `<rect x="8" y="2" width="32" height="32" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="12" y="5" width="24" height="5" rx="1" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="0.8"/><circle cx="15" cy="7.5" r="1.2" fill="currentColor" opacity="0.45"/><rect x="12" y="12" width="24" height="5" rx="1" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="0.8"/><circle cx="15" cy="14.5" r="1.2" fill="currentColor" opacity="0.45"/><rect x="12" y="19" width="24" height="5" rx="1" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="0.8"/><circle cx="15" cy="21.5" r="1.2" fill="currentColor" opacity="0.45"/><rect x="12" y="26" width="24" height="5" rx="1" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="0.8"/><circle cx="15" cy="28.5" r="1.2" fill="currentColor" opacity="0.45"/>`,
  router: `<circle cx="24" cy="18" r="14" fill="none" stroke="currentColor" stroke-width="2"/><line x1="14" y1="18" x2="34" y2="18" stroke="currentColor" stroke-width="1.8"/><line x1="24" y1="8" x2="24" y2="28" stroke="currentColor" stroke-width="1.8"/><polyline points="31,15 34,18 31,21" fill="none" stroke="currentColor" stroke-width="1.8"/><polyline points="17,15 14,18 17,21" fill="none" stroke="currentColor" stroke-width="1.8"/><polyline points="21,11 24,8 27,11" fill="none" stroke="currentColor" stroke-width="1.8"/><polyline points="21,25 24,28 27,25" fill="none" stroke="currentColor" stroke-width="1.8"/>`,
  switch: `<rect x="6" y="10" width="36" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="15" x2="36" y2="15" stroke="currentColor" stroke-width="1.5"/><polyline points="33,12.5 36,15 33,17.5" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="21" x2="36" y2="21" stroke="currentColor" stroke-width="1.5"/><polyline points="15,18.5 12,21 15,23.5" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  firewall: `<rect x="6" y="4" width="36" height="28" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><line x1="6" y1="10" x2="42" y2="10" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="6" y1="16" x2="42" y2="16" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="6" y1="22" x2="42" y2="22" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="6" y1="28" x2="42" y2="28" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="18" y1="4" x2="18" y2="10" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="30" y1="4" x2="30" y2="10" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="12" y1="10" x2="12" y2="16" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="24" y1="10" x2="24" y2="16" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="36" y1="10" x2="36" y2="16" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="18" y1="16" x2="18" y2="22" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="30" y1="16" x2="30" y2="22" stroke="currentColor" stroke-width="1" opacity="0.4"/>`,
  cloud: `<path d="M14,28 A8,8 0 0,1 10,14 A10,10 0 0,1 28,8 A8,8 0 0,1 40,16 A7,7 0 0,1 38,28 Z" fill="none" stroke="currentColor" stroke-width="2"/>`,
  saas: `<path d="M14,26 A7,7 0 0,1 10,14 A9,9 0 0,1 26,8 A7,7 0 0,1 38,14 A6,6 0 0,1 36,26 Z" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="17" y="14" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.25"/><rect x="24" y="14" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.25"/><rect x="20" y="20" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.25"/>`,
  internet: `<circle cx="24" cy="18" r="13" fill="none" stroke="currentColor" stroke-width="1.8"/><ellipse cx="24" cy="18" rx="13" ry="5" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/><ellipse cx="24" cy="18" rx="6" ry="13" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>`,
  mpls: `<path d="M12,26 A7,7 0 0,1 8,16 A8,8 0 0,1 22,10 A7,7 0 0,1 38,14 A6,6 0 0,1 36,26 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4,2"/><text x="24" y="20" text-anchor="middle" fill="currentColor" font-size="7" font-weight="600" opacity="0.5">MPLS</text>`,
  wireless_ap: `<circle cx="24" cy="22" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="24" cy="22" r="2" fill="currentColor" opacity="0.35"/><path d="M16,14 A12,12 0 0,1 32,14" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/><path d="M12,10 A16,16 0 0,1 36,10" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>`,
  cell_tower: `<line x1="24" y1="4" x2="16" y2="34" stroke="currentColor" stroke-width="1.8"/><line x1="24" y1="4" x2="32" y2="34" stroke="currentColor" stroke-width="1.8"/><line x1="18" y1="14" x2="30" y2="14" stroke="currentColor" stroke-width="1.2"/><line x1="17" y1="22" x2="31" y2="22" stroke="currentColor" stroke-width="1.2"/><line x1="16" y1="30" x2="32" y2="30" stroke="currentColor" stroke-width="1.2"/><circle cx="24" cy="4" r="2.5" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.2"/><path d="M30,6 A8,8 0 0,1 34,12" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><path d="M18,6 A8,8 0 0,0 14,12" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>`,
  server: `<rect x="10" y="4" width="28" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="14" cy="8" r="1.2" fill="currentColor" opacity="0.45"/><rect x="10" y="14" width="28" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="14" cy="18" r="1.2" fill="currentColor" opacity="0.45"/><rect x="10" y="24" width="28" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="14" cy="28" r="1.2" fill="currentColor" opacity="0.45"/>`,
  mec: `<rect x="10" y="8" width="22" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="14" y="12" width="14" height="5" rx="1" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="0.8"/><circle cx="17" cy="14.5" r="1" fill="currentColor" opacity="0.45"/><rect x="14" y="20" width="14" height="5" rx="1" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="0.8"/><circle cx="17" cy="22.5" r="1" fill="currentColor" opacity="0.45"/><path d="M34,14 A6,6 0 0,1 34,22" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>`,
  iot_gateway: `<rect x="10" y="10" width="28" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="20" y1="10" x2="20" y2="4" stroke="currentColor" stroke-width="1.5"/><circle cx="20" cy="3" r="1.5" fill="currentColor" opacity="0.35"/><line x1="28" y1="10" x2="28" y2="4" stroke="currentColor" stroke-width="1.5"/><circle cx="28" cy="3" r="1.5" fill="currentColor" opacity="0.35"/><rect x="13" y="22" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.25"/><rect x="18" y="22" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.25"/><rect x="23" y="22" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.25"/><rect x="28" y="22" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.25"/>`,
  vpn: `<rect x="12" y="16" width="24" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M18,16 V12 A6,6 0 0,1 30,12 V16" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="24" cy="23" r="2.5" fill="currentColor" opacity="0.25"/>`,
  load_balancer: `<circle cx="24" cy="18" r="13" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="16" y1="14" x2="32" y2="14" stroke="currentColor" stroke-width="1.5"/><polyline points="29,11.5 32,14 29,16.5" fill="none" stroke="currentColor" stroke-width="1.2"/><line x1="16" y1="22" x2="32" y2="22" stroke="currentColor" stroke-width="1.5"/><polyline points="19,19.5 16,22 19,24.5" fill="none" stroke="currentColor" stroke-width="1.2"/>`,
  phone: `<rect x="8" y="14" width="32" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="11" y="16" width="14" height="8" rx="1" fill="currentColor" opacity="0.1"/><path d="M10,12 Q10,6 16,6 L32,6 Q38,6 38,12" fill="none" stroke="currentColor" stroke-width="1.8"/>`,
  security_cloud: `<path d="M24,4 L38,10 L38,20 Q38,30 24,34 Q10,30 10,20 L10,10 Z" fill="none" stroke="currentColor" stroke-width="1.8"/><polyline points="17,19 22,24 31,14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  sdwan: `<circle cx="18" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/><circle cx="30" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/><circle cx="24" cy="24" r="10" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/><circle cx="24" cy="18" r="3" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1"/>`,
  users: `<circle cx="24" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14,30 Q14,22 24,20 Q34,22 34,30" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="14" cy="10" r="3.5" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.45"/><circle cx="34" cy="10" r="3.5" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.45"/>`,
};

// Colors for each icon type
const COLORS: Record<string, string> = {
  hq_building: "#2563EB", branch: "#2563EB", small_site: "#3B82F6", factory: "#D97706",
  data_center: "#7C3AED", router: "#4F46E5", switch: "#4F46E5", firewall: "#DC2626",
  cloud: "#0891B2", saas: "#0D9488", internet: "#6B7280", mpls: "#7C3AED",
  wireless_ap: "#EA580C", cell_tower: "#EA580C", server: "#059669", mec: "#10B981",
  iot_gateway: "#CA8A04", vpn: "#E11D48", load_balancer: "#7C3AED", phone: "#DB2777",
  security_cloud: "#DC2626", sdwan: "#7C3AED", users: "#0284C7",
};

// Theme
const T = {
  bg: "#FFFFFF", text: "#0F172A", ts: "#475569", tm: "#94A3B8", tf: "#CBD5E1",
  bdr: "#E2E8F0", cl: "#334155", clbg: "#F1F5F9",
  opFill: "rgba(79,70,229,0.03)", opStroke: "rgba(99,102,241,0.18)", opLabel: "#6366F1",
};

function cloudPath(cx: number, cy: number, w: number, h: number): string {
  const hw = w / 2, hh = h / 2;
  return `M ${cx - hw * 0.65},${cy + hh * 0.95} C ${cx - hw * 1.08},${cy + hh * 0.55} ${cx - hw * 1.05},${cy - hh * 0.35} ${cx - hw * 0.55},${cy - hh * 0.65} C ${cx - hw * 0.25},${cy - hh * 1.08} ${cx + hw * 0.15},${cy - hh * 1.1} ${cx + hw * 0.4},${cy - hh * 0.7} C ${cx + hw * 0.65},${cy - hh * 1.05} ${cx + hw * 1.05},${cy - hh * 0.55} ${cx + hw * 1.0},${cy - hh * 0.05} C ${cx + hw * 1.08},${cy + hh * 0.45} ${cx + hw * 0.95},${cy + hh * 0.9} ${cx + hw * 0.55},${cy + hh * 0.95} Z`;
}

interface Position { x: number; y: number; cx: number; cy: number; }

function computeLayout(data: TopologyData, w: number, h: number) {
  const pad = { t: 130, b: 80 };
  const iW = 90, iH = 68;
  const nodeH = 160;
  const custColX = 60, custColW = 220;
  const opLeft = custColX + custColW + 120;
  const opRight = w - 340;
  const opW = opRight - opLeft;
  const extColX = opRight + 120, extColW = 220;
  const opInX = opLeft + opW * 0.12;
  const opCoreX = opLeft + opW * 0.48;
  const opEgX = opLeft + opW * 0.84;
  const opCX = (opLeft + opRight) / 2;
  const opCY = (pad.t + h - pad.b) / 2;

  const pos: Record<string, Position> = {};
  const zones: Record<string, string> = {};

  function col(nodes: TopologyNode[], cx: number, zone: string) {
    const n = nodes.length;
    if (!n) return;
    const totH = n * nodeH;
    const startY = pad.t + (h - pad.t - pad.b - totH) / 2 + (nodeH - iH) / 2;
    nodes.forEach((nd, i) => {
      const y = startY + i * nodeH;
      pos[nd.id] = { x: cx - iW / 2, y, cx, cy: y + iH / 2 };
      zones[nd.id] = zone;
    });
  }

  col(data.customerNodes, custColX + custColW / 2, "customer");
  col(data.operatorNodes.filter(n => n.position === "ingress"), opInX, "op_in");
  col(data.operatorNodes.filter(n => n.position === "core"), opCoreX, "op_core");
  col(data.operatorNodes.filter(n => n.position === "egress"), opEgX, "op_eg");
  col(data.externalNodes, extColX + extColW / 2, "external");

  return { pos, zones, iW, iH, opLeft, opRight, opCX, opCY, opW, pad, custColX, custColW, extColX, extColW };
}

export function renderTopologySVG(data: TopologyData): string {
  const w = 1600, h = 1000;
  const layout = computeLayout(data, w, h);
  const { pos, zones, iW, iH, opLeft, opRight, opCX, opCY, opW, pad, custColX, custColW, extColX, extColW } = layout;
  const opCloudH = h - pad.t - pad.b + 20;
  const allNodes = [...data.customerNodes, ...data.operatorNodes, ...data.externalNodes];

  // Route connection
  function routeConn(conn: Connection) {
    const f = pos[conn.from], t = pos[conn.to];
    if (!f || !t) return null;
    let sx: number, sy: number, ex: number, ey: number;
    if (Math.abs(f.cx - t.cx) < 60) {
      if (f.cy < t.cy) { sx = f.cx; sy = f.cy + iH / 2 + 3; ex = t.cx; ey = t.cy - iH / 2 - 3; }
      else { sx = f.cx; sy = f.cy - iH / 2 - 3; ex = t.cx; ey = t.cy + iH / 2 + 3; }
    } else if (f.cx < t.cx) {
      sx = f.cx + iW / 2 + 3; sy = f.cy; ex = t.cx - iW / 2 - 3; ey = t.cy;
    } else {
      sx = f.cx - iW / 2 - 3; sy = f.cy; ex = t.cx + iW / 2 - 3; ey = t.cy;
    }
    const dx = ex - sx, dy = ey - sy;
    const cp = Math.max(Math.abs(dx) * 0.3, 25);
    const pathD = Math.abs(dy) > Math.abs(dx) * 2
      ? `M${sx},${sy} C${sx},${sy + Math.sign(dy) * cp} ${ex},${ey - Math.sign(dy) * cp} ${ex},${ey}`
      : `M${sx},${sy} C${sx + Math.sign(dx) * cp},${sy} ${ex - Math.sign(dx) * cp},${ey} ${ex},${ey}`;
    const fz = zones[conn.from] || "", tz = zones[conn.to] || "";
    const crossIn = fz === "customer" && tz.startsWith("op_");
    const crossOut = fz.startsWith("op_") && tz === "external";
    return { sx, sy, ex, ey, pathD, crossIn, crossOut, mx: (sx + ex) / 2, my: (sy + ey) / 2 };
  }

  // Build SVG
  let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <pattern id="tgrid" width="28" height="28" patternUnits="userSpaceOnUse">
    <circle cx="14" cy="14" r="0.6" fill="${T.tf}" opacity="0.3"/>
  </pattern>
  <marker id="ah" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
    <polygon points="0 0.5,9 4,0 7.5" fill="${T.tm}" opacity="0.5"/>
  </marker>
</defs>
<rect width="${w}" height="${h}" fill="url(#tgrid)"/>
<rect width="${w}" height="${h}" fill="${T.bg}" opacity="0.95"/>

<!-- Title -->
<text x="${w / 2}" y="58" text-anchor="middle" fill="${T.text}" font-size="72" font-weight="700" font-family="Söhne, ui-sans-serif, system-ui, -apple-system, sans-serif">${escapeXml(data.solutionTitle)}</text>
<text x="${w / 2}" y="105" text-anchor="middle" fill="${T.ts}" font-size="40" font-family="Söhne Mono, ui-monospace, Menlo, Monaco, monospace">${escapeXml(data.customer)} · ${escapeXml(data.industry)}</text>

<!-- Zone labels -->
<text x="${custColX + custColW / 2}" y="${pad.t - 18}" text-anchor="middle" fill="${T.ts}" font-size="36" font-family="Söhne Mono, ui-monospace, Menlo, Monaco, monospace" letter-spacing="3" font-weight="700">CUSTOMER PREMISES</text>
<text x="${opCX}" y="${pad.t - 18}" text-anchor="middle" fill="${T.opLabel}" font-size="36" font-family="Söhne Mono, ui-monospace, Menlo, Monaco, monospace" letter-spacing="3" font-weight="700">OPERATOR NETWORK</text>
<text x="${extColX + extColW / 2}" y="${pad.t - 18}" text-anchor="middle" fill="${T.ts}" font-size="36" font-family="Söhne Mono, ui-monospace, Menlo, Monaco, monospace" letter-spacing="3" font-weight="700">EXTERNAL SERVICES</text>

<!-- Operator cloud -->
<path d="${cloudPath(opCX, opCY, opW + 100, opCloudH)}" fill="${T.opFill}" stroke="${T.opStroke}" stroke-width="3" stroke-dasharray="12,7"/>
`;

  // Connections
  for (const conn of data.connections) {
    const r = routeConn(conn);
    if (!r) continue;
    const fn = allNodes.find(n => n.id === conn.from);
    const cc = COLORS[fn?.type || ""] || T.tm;
    const dash = conn.style === "dashed" ? "9,6" : "none";
    const sw = conn.style === "double" ? 4 : 2.5;

    if (conn.style === "double") {
      svg += `<path d="${r.pathD}" fill="none" stroke="${cc}" stroke-width="10" opacity="0.06"/>\n`;
    }
    svg += `<path d="${r.pathD}" fill="none" stroke="${cc}" stroke-width="${sw}" stroke-dasharray="${dash}" opacity="0.5" marker-end="url(#ah)"/>\n`;

    if (r.crossIn) {
      svg += `<circle cx="${opLeft}" cy="${(r.sy + r.ey) / 2}" r="5" fill="${cc}" opacity="0.4" stroke="${T.opStroke}" stroke-width="2"/>\n`;
    }
    if (r.crossOut) {
      svg += `<circle cx="${opRight}" cy="${(r.sy + r.ey) / 2}" r="5" fill="${cc}" opacity="0.4" stroke="${T.opStroke}" stroke-width="2"/>\n`;
    }
    if (conn.label) {
      const lw = conn.label.length * 22 + 40;
      svg += `<rect x="${r.mx - lw / 2}" y="${r.my - 24}" width="${lw}" height="48" rx="24" fill="${T.clbg}" stroke="${T.bdr}" stroke-width="1" opacity="0.95"/>\n`;
      svg += `<text x="${r.mx}" y="${r.my + 12}" text-anchor="middle" fill="${T.text}" font-size="36" font-family="Söhne Mono, ui-monospace, Menlo, Monaco, monospace" font-weight="600">${escapeXml(conn.label)}</text>\n`;
    }
  }

  // Nodes
  for (const nd of allNodes) {
    const p = pos[nd.id];
    if (!p) continue;
    const col = COLORS[nd.type] || T.tm;
    const iconSvg = ICONS[nd.type] || ICONS.cloud;
    const params = (nd.params || []).slice(0, 3);
    const isOp = (zones[nd.id] || "").startsWith("op_");
    const ly = p.cy + iH / 2 + 20;

    svg += `<g>
  <svg x="${p.cx - iW / 2}" y="${p.cy - iH / 2}" width="${iW}" height="${iH}" viewBox="0 0 48 36" style="color:${col};overflow:visible">${iconSvg.replace(/currentColor/g, col)}</svg>
  <text x="${p.cx}" y="${ly}" text-anchor="middle" fill="${isOp ? T.opLabel : T.text}" font-size="56" font-weight="700" font-family="Söhne, ui-sans-serif, system-ui, -apple-system, sans-serif">${escapeXml(nd.label)}${nd.count && nd.count > 1 ? ` (×${nd.count})` : ""}</text>
`;
    for (let i = 0; i < params.length; i++) {
      svg += `  <text x="${p.cx}" y="${ly + 48 + i * 42}" text-anchor="middle" fill="${T.ts}" font-size="38" font-family="Söhne Mono, ui-monospace, Menlo, Monaco, monospace">${escapeXml(params[i])}</text>\n`;
    }
    svg += `</g>\n`;
  }

  // Footer labels
  svg += `<text x="${opLeft}" y="${h - pad.b + 35}" text-anchor="middle" fill="${T.opLabel}" font-size="28" font-family="Söhne Mono, ui-monospace, Menlo, Monaco, monospace" letter-spacing="3" font-weight="600">▸ INGRESS</text>
<text x="${opRight}" y="${h - pad.b + 35}" text-anchor="middle" fill="${T.opLabel}" font-size="28" font-family="Söhne Mono, ui-monospace, Menlo, Monaco, monospace" letter-spacing="3" font-weight="600">EGRESS ▸</text>
</svg>`;

  return svg;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
