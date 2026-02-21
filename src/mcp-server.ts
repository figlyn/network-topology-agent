// MCP server with Apps SDK for ChatGPT UI integration
// Uses WebStandardStreamableHTTPServerTransport for Cloudflare Workers

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { renderTopologySVG } from "./svg-renderer";
import {
  CustomerNodeTypes,
  OperatorNodeTypes,
  ExternalNodeTypes,
  OperatorPositions,
  ConnectionStyles,
  LIMITS,
  validateTopology,
  type TopologyData,
} from "./schemas";
import { corsHeaders, withCors, errorResponse } from "./cors";

// HTML widget with interactive canvas - drag nodes, edit labels, export SVG
const SVG_VIEWER_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; }
    body { font-family: 'DM Sans', sans-serif; background: #fff; }
    .container { width: 100%; padding: 8px; }
    .toolbar { display: flex; gap: 6px; margin-bottom: 8px; align-items: center; flex-wrap: wrap; }
    .toolbar button {
      padding: 8px 14px; border-radius: 6px; border: 1px solid #e2e8f0;
      background: #fff; color: #475569; font-size: 13px; cursor: pointer;
      font-family: 'JetBrains Mono', monospace; transition: all 0.2s;
    }
    .toolbar button:hover { background: #f1f5f9; border-color: #cbd5e1; }
    .toolbar button.active { background: rgba(59,130,246,0.1); border-color: #3b82f6; color: #3b82f6; }
    .toolbar .zoom-group { display: flex; gap: 2px; }
    .toolbar .zoom-group button { padding: 8px 12px; font-size: 16px; font-weight: bold; }
    .toolbar .hint { font-size: 11px; color: #94a3b8; margin-left: auto; }
    .canvas { width: 100%; overflow: auto; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; position: relative; }
    .canvas svg { display: block; cursor: default; }
    .canvas.edit-mode svg { cursor: grab; }
    .canvas.dragging svg { cursor: grabbing; }
    .loading { color: #6b7280; padding: 32px; text-align: center; }
    .edit-input {
      position: fixed; padding: 4px 8px; border: 2px solid #3b82f6;
      border-radius: 4px; background: #fff; font-size: 12px;
      font-family: 'DM Sans', sans-serif; outline: none; text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; min-width: 120px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="toolbar">
      <button id="editBtn" onclick="window.toggleEdit()">✎ Edit</button>
      <div class="zoom-group">
        <button onclick="window.zoomOut()">−</button>
        <button onclick="window.zoomIn()">+</button>
      </div>
      <button onclick="window.exportSVG()">↓ Export</button>
      <span class="hint" id="hint"></span>
    </div>
    <div id="canvas" class="canvas">
      <div class="loading">Loading diagram...</div>
    </div>
  </div>
  <script>
    var canvas = document.getElementById('canvas');
    var editBtn = document.getElementById('editBtn');
    var hint = document.getElementById('hint');

    var topology = null;
    var overrides = {};
    var editMode = false;
    var dragState = null;
    var svgEl = null;
    var scale = 1.0;
    var activeInput = null;

    // Theme colors
    var T = {
      bg:'#FFFFFF',text:'#0F172A',ts:'#475569',tm:'#94A3B8',tf:'#CBD5E1',
      bdr:'#E2E8F0',cl:'#334155',clbg:'#F1F5F9',
      opFill:'rgba(79,70,229,0.03)',opStroke:'rgba(99,102,241,0.18)',opLabel:'#6366F1',
      sel:'rgba(59,130,246,0.08)',selStroke:'#3B82F6'
    };
    var TC = {
      hq_building:'#2563EB',branch:'#2563EB',small_site:'#3B82F6',factory:'#D97706',
      data_center:'#7C3AED',router:'#4F46E5',switch:'#4F46E5',firewall:'#DC2626',
      cloud:'#0891B2',saas:'#0D9488',internet:'#6B7280',mpls:'#7C3AED',
      wireless_ap:'#EA580C',cell_tower:'#EA580C',server:'#059669',mec:'#10B981',
      iot_gateway:'#CA8A04',vpn:'#E11D48',load_balancer:'#7C3AED',phone:'#DB2777',
      security_cloud:'#DC2626',sdwan:'#7C3AED',users:'#0284C7'
    };

    // Icon paths (simplified)
    var ICONS = {
      hq_building: '<rect x="14" y="2" width="20" height="32" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="12" width="10" height="22" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="34" y="12" width="10" height="22" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      branch: '<rect x="6" y="8" width="36" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="4" y1="8" x2="44" y2="8" stroke="currentColor" stroke-width="2"/>',
      small_site: '<rect x="10" y="10" width="28" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="8" y1="10" x2="40" y2="10" stroke="currentColor" stroke-width="2"/>',
      factory: '<rect x="4" y="14" width="36" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><polyline points="4,14 4,6 16,14 16,6 28,14 28,6 40,14" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      data_center: '<rect x="8" y="2" width="32" height="32" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="12" y="5" width="24" height="5" rx="1" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="0.8"/><rect x="12" y="12" width="24" height="5" rx="1" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="0.8"/>',
      router: '<circle cx="24" cy="18" r="14" fill="none" stroke="currentColor" stroke-width="2"/><line x1="14" y1="18" x2="34" y2="18" stroke="currentColor" stroke-width="1.8"/><line x1="24" y1="8" x2="24" y2="28" stroke="currentColor" stroke-width="1.8"/>',
      switch: '<rect x="6" y="10" width="36" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="15" x2="36" y2="15" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="21" x2="36" y2="21" stroke="currentColor" stroke-width="1.5"/>',
      firewall: '<rect x="6" y="4" width="36" height="28" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><line x1="6" y1="10" x2="42" y2="10" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="6" y1="16" x2="42" y2="16" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="6" y1="22" x2="42" y2="22" stroke="currentColor" stroke-width="1" opacity="0.4"/>',
      cloud: '<path d="M14,28 A8,8 0 0,1 10,14 A10,10 0 0,1 28,8 A8,8 0 0,1 40,16 A7,7 0 0,1 38,28 Z" fill="none" stroke="currentColor" stroke-width="2"/>',
      saas: '<path d="M14,26 A7,7 0 0,1 10,14 A9,9 0 0,1 26,8 A7,7 0 0,1 38,14 A6,6 0 0,1 36,26 Z" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="17" y="14" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.25"/><rect x="24" y="14" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.25"/>',
      internet: '<circle cx="24" cy="18" r="13" fill="none" stroke="currentColor" stroke-width="1.8"/><ellipse cx="24" cy="18" rx="13" ry="5" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/><ellipse cx="24" cy="18" rx="6" ry="13" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>',
      mpls: '<path d="M12,26 A7,7 0 0,1 8,16 A8,8 0 0,1 22,10 A7,7 0 0,1 38,14 A6,6 0 0,1 36,26 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4,2"/><text x="24" y="20" text-anchor="middle" fill="currentColor" font-size="7" font-weight="600" opacity="0.5">MPLS</text>',
      wireless_ap: '<circle cx="24" cy="22" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="24" cy="22" r="2" fill="currentColor" opacity="0.35"/><path d="M16,14 A12,12 0 0,1 32,14" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>',
      cell_tower: '<line x1="24" y1="4" x2="16" y2="34" stroke="currentColor" stroke-width="1.8"/><line x1="24" y1="4" x2="32" y2="34" stroke="currentColor" stroke-width="1.8"/><line x1="18" y1="14" x2="30" y2="14" stroke="currentColor" stroke-width="1.2"/><line x1="17" y1="22" x2="31" y2="22" stroke="currentColor" stroke-width="1.2"/>',
      server: '<rect x="10" y="4" width="28" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="10" y="14" width="28" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="10" y="24" width="28" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      mec: '<rect x="10" y="8" width="22" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="14" y="12" width="14" height="5" rx="1" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="0.8"/>',
      iot_gateway: '<rect x="10" y="10" width="28" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="20" y1="10" x2="20" y2="4" stroke="currentColor" stroke-width="1.5"/><line x1="28" y1="10" x2="28" y2="4" stroke="currentColor" stroke-width="1.5"/>',
      vpn: '<rect x="12" y="16" width="24" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M18,16 V12 A6,6 0 0,1 30,12 V16" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="24" cy="23" r="2.5" fill="currentColor" opacity="0.25"/>',
      load_balancer: '<circle cx="24" cy="18" r="13" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="16" y1="14" x2="32" y2="14" stroke="currentColor" stroke-width="1.5"/><line x1="16" y1="22" x2="32" y2="22" stroke="currentColor" stroke-width="1.5"/>',
      phone: '<rect x="8" y="14" width="32" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="11" y="16" width="14" height="8" rx="1" fill="currentColor" opacity="0.1"/><path d="M10,12 Q10,6 16,6 L32,6 Q38,6 38,12" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      security_cloud: '<path d="M24,4 L38,10 L38,20 Q38,30 24,34 Q10,30 10,20 L10,10 Z" fill="none" stroke="currentColor" stroke-width="1.8"/><polyline points="17,19 22,24 31,14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
      sdwan: '<circle cx="18" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/><circle cx="30" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/><circle cx="24" cy="24" r="10" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>',
      users: '<circle cx="24" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14,30 Q14,22 24,20 Q34,22 34,30" fill="none" stroke="currentColor" stroke-width="1.8"/>'
    };

    function computeLayout(data, w, h, s) {
      // Scale-aware sizes
      const iW = 70 * s, iH = 53 * s, nodeH = 130 * s;
      const pad = {t: 100 * s, b: 60 * s};
      const custColX = 50 * s, custColW = 180 * s;
      const opLeft = custColX + custColW + 100 * s;
      const opRight = w - 280 * s;
      const opW = opRight - opLeft;
      const extColX = opRight + 100 * s, extColW = 180 * s;
      const opInX = opLeft + opW * 0.12;
      const opCoreX = opLeft + opW * 0.48;
      const opEgX = opLeft + opW * 0.84;
      const pos = {}, zones = {};

      function col(nodes, cx, zone) {
        const n = nodes.length; if (!n) return;
        const totH = n * nodeH;
        const startY = pad.t + (h - pad.t - pad.b - totH) / 2 + (nodeH - iH) / 2;
        nodes.forEach((nd, i) => {
          const y = startY + i * nodeH;
          pos[nd.id] = { x: cx - iW/2, y, cx, cy: y + iH/2 };
          zones[nd.id] = zone;
        });
      }

      col(data.customerNodes, custColX + custColW/2, 'customer');
      col(data.operatorNodes.filter(n=>n.position==='ingress'), opInX, 'op_in');
      col(data.operatorNodes.filter(n=>n.position==='core'), opCoreX, 'op_core');
      col(data.operatorNodes.filter(n=>n.position==='egress'), opEgX, 'op_eg');
      col(data.externalNodes, extColX + extColW/2, 'external');

      return { pos, zones, iW, iH, opLeft, opRight, opW, pad, custColX, custColW, extColX, extColW,
               opCX: (opLeft + opRight) / 2, opCY: (pad.t + h - pad.b) / 2, scale: s };
    }

    function cloudPath(cx, cy, w, h) {
      const hw=w/2, hh=h/2;
      return \`M \${cx-hw*0.65},\${cy+hh*0.95} C \${cx-hw*1.08},\${cy+hh*0.55} \${cx-hw*1.05},\${cy-hh*0.35} \${cx-hw*0.55},\${cy-hh*0.65} C \${cx-hw*0.25},\${cy-hh*1.08} \${cx+hw*0.15},\${cy-hh*1.1} \${cx+hw*0.4},\${cy-hh*0.7} C \${cx+hw*0.65},\${cy-hh*1.05} \${cx+hw*1.05},\${cy-hh*0.55} \${cx+hw*1.0},\${cy-hh*0.05} C \${cx+hw*1.08},\${cy+hh*0.45} \${cx+hw*0.95},\${cy+hh*0.9} \${cx+hw*0.55},\${cy+hh*0.95} Z\`;
    }

    function getPos(id, layout) {
      const base = layout.pos[id];
      if (!base) return null;
      const ov = overrides[id];
      if (!ov) return { ...base };
      return { x: base.x + ov.dx, y: base.y + ov.dy, cx: base.cx + ov.dx, cy: base.cy + ov.dy };
    }

    function renderSVG() {
      console.log('renderSVG called, topology:', !!topology, 'scale:', scale);
      if (!topology) { console.error('No topology data'); return; }
      try {
      // Remove any active input when re-rendering
      if (activeInput) { activeInput.remove(); activeInput = null; }

      // Fixed canvas size - scale only affects element sizes
      var w = 1600, h = 900;
      var s = scale;
      var layout = computeLayout(topology, w, h, s);
      var pos = layout.pos, zones = layout.zones, iW = layout.iW, iH = layout.iH;
      var opLeft = layout.opLeft, opRight = layout.opRight, opW = layout.opW, pad = layout.pad;
      var opCX = layout.opCX, opCY = layout.opCY, custColX = layout.custColX, custColW = layout.custColW;
      var extColX = layout.extColX, extColW = layout.extColW;
      var opCloudH = h - pad.t - pad.b + 30 * s;
      var allNodes = topology.customerNodes.concat(topology.operatorNodes).concat(topology.externalNodes);

      // Font sizes scaled
      var fs = { title: 22 * s, subtitle: 13 * s, zone: 10 * s, label: 14 * s, param: 11 * s, conn: 10 * s, footer: 9 * s };

      var svg = '<svg width="100%" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="font-family:DM Sans,sans-serif" preserveAspectRatio="xMidYMid meet">';

      // Background
      const gridSize = 20 * s;
      svg += \`<defs><pattern id="grid" width="\${gridSize}" height="\${gridSize}" patternUnits="userSpaceOnUse"><circle cx="\${gridSize/2}" cy="\${gridSize/2}" r="\${0.5*s}" fill="\${T.tf}" opacity="0.3"/></pattern></defs>\`;
      svg += \`<rect width="\${w}" height="\${h}" fill="url(#grid)"/>\`;

      // Title
      svg += \`<text x="\${w/2}" y="\${35*s}" text-anchor="middle" fill="\${T.text}" font-size="\${fs.title}" font-weight="700" data-field="solutionTitle" style="cursor:pointer">\${topology.solutionTitle}</text>\`;
      svg += \`<text x="\${w/2}" y="\${55*s}" text-anchor="middle" fill="\${T.tm}" font-size="\${fs.subtitle}" font-family="'JetBrains Mono',monospace">\${topology.customer} · \${topology.industry}</text>\`;

      // Zone labels
      svg += \`<text x="\${custColX+custColW/2}" y="\${pad.t-18*s}" text-anchor="middle" fill="\${T.tf}" font-size="\${fs.zone}" font-family="'JetBrains Mono',monospace" letter-spacing="2" font-weight="600">CUSTOMER PREMISES</text>\`;
      svg += \`<text x="\${opCX}" y="\${pad.t-18*s}" text-anchor="middle" fill="\${T.opLabel}" font-size="\${fs.zone}" font-family="'JetBrains Mono',monospace" letter-spacing="2" font-weight="600">OPERATOR NETWORK</text>\`;
      svg += \`<text x="\${extColX+extColW/2}" y="\${pad.t-18*s}" text-anchor="middle" fill="\${T.tf}" font-size="\${fs.zone}" font-family="'JetBrains Mono',monospace" letter-spacing="2" font-weight="600">EXTERNAL SERVICES</text>\`;

      // Operator cloud
      svg += \`<path d="\${cloudPath(opCX, opCY, opW+80*s, opCloudH)}" fill="\${T.opFill}" stroke="\${T.opStroke}" stroke-width="\${2.5*s}" stroke-dasharray="\${10*s},\${6*s}"/>\`;

      // Connections
      topology.connections.forEach((conn, idx) => {
        const f = getPos(conn.from, layout), t = getPos(conn.to, layout);
        if (!f || !t) return;
        let sx, sy, ex, ey;
        if (Math.abs(f.cx - t.cx) < 80*s) {
          if (f.cy < t.cy) { sx=f.cx; sy=f.cy+iH/2+4*s; ex=t.cx; ey=t.cy-iH/2-4*s; }
          else { sx=f.cx; sy=f.cy-iH/2-4*s; ex=t.cx; ey=t.cy+iH/2+4*s; }
        } else if (f.cx < t.cx) { sx=f.cx+iW/2+4*s; sy=f.cy; ex=t.cx-iW/2-4*s; ey=t.cy; }
        else { sx=f.cx-iW/2-4*s; sy=f.cy; ex=t.cx+iW/2+4*s; ey=t.cy; }

        const dx=ex-sx, dy=ey-sy, cp=Math.max(Math.abs(dx)*0.3, 30*s);
        const pathD = Math.abs(dy) > Math.abs(dx)*2
          ? \`M\${sx},\${sy} C\${sx},\${sy+Math.sign(dy)*cp} \${ex},\${ey-Math.sign(dy)*cp} \${ex},\${ey}\`
          : \`M\${sx},\${sy} C\${sx+Math.sign(dx)*cp},\${sy} \${ex-Math.sign(dx)*cp},\${ey} \${ex},\${ey}\`;

        const fn = allNodes.find(n=>n.id===conn.from);
        const cc = TC[fn?.type]||T.tm;
        const dash = conn.style==='dashed'?\`\${6*s},\${5*s}\`:'none';
        const sw = conn.style==='double'? 3*s : 1.8*s;

        if (conn.style==='double') svg += \`<path d="\${pathD}" fill="none" stroke="\${cc}" stroke-width="\${8*s}" opacity="0.06"/>\`;
        svg += \`<path d="\${pathD}" fill="none" stroke="\${cc}" stroke-width="\${sw}" stroke-dasharray="\${dash}" opacity="0.5"/>\`;

        if (conn.label) {
          const mx = (sx+ex)/2, my = (sy+ey)/2;
          const lw = conn.label.length * 7 * s + 16 * s;
          svg += \`<rect x="\${mx-lw/2}" y="\${my-10*s}" width="\${lw}" height="\${20*s}" rx="\${10*s}" fill="\${T.clbg}" stroke="\${T.bdr}" stroke-width="\${0.5*s}" opacity="0.93"/>\`;
          svg += \`<text x="\${mx}" y="\${my+4*s}" text-anchor="middle" fill="\${T.cl}" font-size="\${fs.conn}" font-family="'JetBrains Mono',monospace" font-weight="500" data-conn="\${idx}" style="cursor:pointer">\${conn.label}</text>\`;
        }
      });

      // Nodes
      allNodes.forEach(nd => {
        const p = getPos(nd.id, layout); if (!p) return;
        const col = TC[nd.type]||T.tm;
        const icon = ICONS[nd.type]||ICONS.cloud;
        const params = (nd.params||[]).slice(0,3);
        const isOp = (zones[nd.id]||'').startsWith('op_');
        const ly = p.cy + iH/2 + 16*s;

        svg += \`<g data-node="\${nd.id}" style="cursor:\${editMode?'grab':'default'}">\`;
        if (editMode) svg += \`<rect x="\${p.cx-iW/2-6*s}" y="\${p.cy-iH/2-6*s}" width="\${iW+12*s}" height="\${iH+12*s}" rx="\${5*s}" fill="transparent" stroke="\${T.selStroke}" stroke-width="\${1.5*s}" opacity="0.3"/>\`;
        svg += \`<svg x="\${p.cx-iW/2}" y="\${p.cy-iH/2}" width="\${iW}" height="\${iH}" viewBox="0 0 48 36" style="color:\${col};overflow:visible">\${icon}</svg>\`;
        svg += \`<text x="\${p.cx}" y="\${ly}" text-anchor="middle" fill="\${isOp?T.opLabel:T.text}" font-size="\${fs.label}" font-weight="600" data-label="\${nd.id}" style="cursor:pointer">\${nd.label}\${nd.count>1?' (×'+nd.count+')':''}</text>\`;
        params.forEach((pr, i) => {
          svg += \`<text x="\${p.cx}" y="\${ly+15*s+i*14*s}" text-anchor="middle" fill="\${T.ts}" font-size="\${fs.param}" font-family="'JetBrains Mono',monospace" opacity="0.7" data-param="\${nd.id}-\${i}" style="cursor:pointer">\${pr}</text>\`;
        });
        svg += \`</g>\`;
      });

      // Footer labels
      svg += \`<text x="\${opLeft}" y="\${h-pad.b+25*s}" text-anchor="middle" fill="\${T.opLabel}" font-size="\${fs.footer}" font-family="'JetBrains Mono',monospace" letter-spacing="1.5" opacity="0.5">▸ INGRESS</text>\`;
      svg += \`<text x="\${opRight}" y="\${h-pad.b+25*s}" text-anchor="middle" fill="\${T.opLabel}" font-size="\${fs.footer}" font-family="'JetBrains Mono',monospace" letter-spacing="1.5" opacity="0.5">EGRESS ▸</text>\`;

      if (editMode) svg += \`<text x="\${w-15*s}" y="\${h-12*s}" text-anchor="end" fill="\${T.tm}" font-size="\${fs.param}" font-family="'JetBrains Mono',monospace" opacity="0.5">Drag to move · Double-click to edit</text>\`;

      svg += \`</svg>\`;
      canvas.innerHTML = svg;
      svgEl = canvas.querySelector('svg');
      attachEventHandlers();
      console.log('renderSVG complete');
      } catch(e) { console.error('renderSVG error:', e); }
    }

    function attachEventHandlers() {
      if (!svgEl) return;
      const w = 1600 * scale, h = 900 * scale;
      const layout = computeLayout(topology, w, h, scale);

      // Drag handlers (only in edit mode)
      if (editMode) {
        svgEl.querySelectorAll('[data-node]').forEach(g => {
          const nodeId = g.dataset.node;
          g.addEventListener('mousedown', e => {
            if (e.target.closest('[data-label]') || e.target.closest('[data-param]')) return;
            e.preventDefault();
            const pt = svgEl.createSVGPoint();
            pt.x = e.clientX; pt.y = e.clientY;
            const svgPt = pt.matrixTransform(svgEl.getScreenCTM().inverse());
            const p = getPos(nodeId, layout);
            dragState = { nodeId, offsetX: svgPt.x - p.cx, offsetY: svgPt.y - p.cy };
            canvas.classList.add('dragging');
          });
        });
      }

      // Double-click to edit labels (always available)
      svgEl.querySelectorAll('[data-label]').forEach(txt => {
        txt.addEventListener('dblclick', e => {
          e.preventDefault();
          e.stopPropagation();
          showEditor(txt, 'label');
        });
      });

      // Double-click to edit params
      svgEl.querySelectorAll('[data-param]').forEach(txt => {
        txt.addEventListener('dblclick', e => {
          e.preventDefault();
          e.stopPropagation();
          showEditor(txt, 'param');
        });
      });

      // Double-click to edit connection labels
      svgEl.querySelectorAll('[data-conn]').forEach(txt => {
        txt.addEventListener('dblclick', e => {
          e.preventDefault();
          e.stopPropagation();
          showEditor(txt, 'conn');
        });
      });
    }

    function showEditor(element, type) {
      if (activeInput) { activeInput.remove(); activeInput = null; }

      const rect = element.getBoundingClientRect();
      const input = document.createElement('input');
      input.className = 'edit-input';
      activeInput = input;

      let currentValue = '';
      let saveCallback = null;

      if (type === 'label') {
        const nodeId = element.dataset.label;
        const node = [...topology.customerNodes, ...topology.operatorNodes, ...topology.externalNodes].find(n => n.id === nodeId);
        if (!node) return;
        currentValue = node.label + (node.count > 1 ? ' (x' + node.count + ')' : '');
        saveCallback = (val) => {
          const m = val.match(/^(.+?)(?:\\s*\\([x×](\\d+)\\))?$/);
          if (m) { node.label = m[1].trim(); if (m[2]) node.count = parseInt(m[2]); }
          else node.label = val;
        };
      } else if (type === 'param') {
        const [nodeId, idx] = element.dataset.param.split('-');
        const node = [...topology.customerNodes, ...topology.operatorNodes, ...topology.externalNodes].find(n => n.id === nodeId);
        if (!node || !node.params) return;
        currentValue = node.params[parseInt(idx)] || '';
        saveCallback = (val) => { node.params[parseInt(idx)] = val; };
      } else if (type === 'conn') {
        const idx = parseInt(element.dataset.conn);
        const conn = topology.connections[idx];
        if (!conn) return;
        currentValue = conn.label || '';
        saveCallback = (val) => { conn.label = val; };
      }

      input.value = currentValue;
      input.style.left = (rect.left + rect.width/2 - 75) + 'px';
      input.style.top = (rect.top - 4) + 'px';
      input.style.width = '150px';
      document.body.appendChild(input);

      setTimeout(() => { input.focus(); input.select(); }, 10);

      const save = () => {
        if (!activeInput) return;
        const val = input.value.trim();
        if (saveCallback && val) saveCallback(val);
        input.remove();
        activeInput = null;
        renderSVG();
      };

      const cancel = () => {
        input.remove();
        activeInput = null;
      };

      input.addEventListener('blur', () => setTimeout(save, 100));
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      });
    }

    document.addEventListener('mousemove', e => {
      if (!dragState || !svgEl) return;
      const w = 1600 * scale, h = 900 * scale;
      const layout = computeLayout(topology, w, h, scale);
      const pt = svgEl.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const svgPt = pt.matrixTransform(svgEl.getScreenCTM().inverse());
      const base = layout.pos[dragState.nodeId];
      if (!base) return;
      overrides[dragState.nodeId] = {
        dx: svgPt.x - dragState.offsetX - base.cx,
        dy: svgPt.y - dragState.offsetY - base.cy
      };
      renderSVG();
    });

    document.addEventListener('mouseup', () => {
      dragState = null;
      canvas.classList.remove('dragging');
    });

    // Global functions for button onclick handlers
    window.toggleEdit = function() {
      editMode = !editMode;
      editBtn.classList.toggle('active', editMode);
      editBtn.textContent = editMode ? '✓ Editing' : '✎ Edit';
      hint.textContent = editMode ? 'Drag nodes · Double-click to edit' : 'Double-click text to edit';
      canvas.classList.toggle('edit-mode', editMode);
      renderSVG();
    };

    window.zoomIn = function() {
      scale = Math.min(scale + 0.15, 1.8);
      console.log('Zoom in, new scale:', scale);
      renderSVG();
    };

    window.zoomOut = function() {
      scale = Math.max(scale - 0.15, 0.7);
      console.log('Zoom out, new scale:', scale);
      renderSVG();
    };

    window.exportSVG = function() {
      if (!svgEl) { console.error('No SVG to export'); return; }
      try {
        var clone = svgEl.cloneNode(true);
        // Remove transform for export
        clone.style.transform = '';
        clone.setAttribute('width', '1600');
        clone.setAttribute('height', '900');
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        var bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('width', '100%');
        bgRect.setAttribute('height', '100%');
        bgRect.setAttribute('fill', '#ffffff');
        clone.insertBefore(bgRect, clone.firstChild);

        var svgData = new XMLSerializer().serializeToString(clone);
        console.log('SVG data length:', svgData.length);

        // Use blob URL instead of data URL (more reliable for large SVGs)
        var blob = new Blob([svgData], {type: 'image/svg+xml'});
        var blobUrl = URL.createObjectURL(blob);
        console.log('Blob URL created:', blobUrl);

        // Create modal using DOM APIs
        var modal = document.createElement('div');
        modal.id = 'export-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999';

        var box = document.createElement('div');
        box.style.cssText = 'background:#fff;padding:24px;border-radius:12px;text-align:center;max-width:90%';

        var msg = document.createElement('p');
        msg.style.cssText = 'margin:0 0 16px;font-size:14px;color:#333';
        msg.textContent = 'Click Download to save your diagram:';

        var link = document.createElement('a');
        link.href = blobUrl;
        link.download = 'network-topology.svg';
        link.textContent = 'Download SVG';
        link.style.cssText = 'display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = 'display:block;margin:16px auto 0;padding:8px 16px;border:1px solid #e2e8f0;background:#fff;border-radius:6px;cursor:pointer;font-size:12px';
        closeBtn.onclick = function() { modal.remove(); URL.revokeObjectURL(blobUrl); };

        box.appendChild(msg);
        box.appendChild(link);
        box.appendChild(closeBtn);
        modal.appendChild(box);
        modal.onclick = function(e) { if (e.target === modal) { modal.remove(); URL.revokeObjectURL(blobUrl); } };
        document.body.appendChild(modal);
      } catch (e) {
        console.error('Export failed:', e);
      }
    };

    // Data loading - try many possible locations
    function tryGetData(obj) {
      if (!obj) return null;
      // Direct topology object
      if (obj.customerNodes && obj.operatorNodes) return obj;
      // toolInput is what ChatGPT passes TO the tool - check this first!
      if (obj.toolInput && obj.toolInput.customerNodes) {
        console.log('Found topology in toolInput');
        return obj.toolInput;
      }
      // Check nested locations
      var checks = [
        ['toolResponseMetadata', 'topology'],
        ['toolOutput', 'topology'],
        ['structuredContent', 'topology'],
        ['toolResponseMetadata'],
        ['toolOutput'],
        ['structuredContent'],
        ['data']
      ];
      for (var i = 0; i < checks.length; i++) {
        var path = checks[i];
        var val = obj;
        for (var j = 0; j < path.length; j++) {
          val = val && val[path[j]];
        }
        if (val && val.customerNodes && val.operatorNodes) {
          console.log('Found topology in', path.join('.'));
          return val;
        }
      }
      return null;
    }

    function tryLoad() {
      const openai = window.openai;
      if (!openai) return false;
      const data = tryGetData(openai);
      if (data) {
        topology = data;
        renderSVG();
        return true;
      }
      return false;
    }

    window.addEventListener('message', (event) => {
      const data = tryGetData(event.data);
      if (data) {
        topology = data;
        renderSVG();
      }
    });

    function showDebug() {
      const openai = window.openai || {};
      const info = {
        hasOpenai: !!window.openai,
        keys: Object.keys(openai),
        toolOutput: openai.toolOutput ? Object.keys(openai.toolOutput) : null,
        toolResponseMetadata: openai.toolResponseMetadata ? Object.keys(openai.toolResponseMetadata) : null,
        structuredContent: openai.structuredContent ? Object.keys(openai.structuredContent) : null,
      };
      canvas.innerHTML = '<div style="padding:16px;background:#f7f7f8;border-radius:8px;font-size:11px;font-family:monospace;white-space:pre-wrap">' +
        '<b>Debug: Looking for topology data</b>\\n\\n' + JSON.stringify(info, null, 2) +
        '\\n\\n<b>Tip:</b> Reconnect the ChatGPT connector to refresh the widget.</div>';
    }

    if (!tryLoad()) {
      let attempts = 0;
      const poll = () => {
        attempts++;
        if (tryLoad()) return;
        if (attempts < 50) setTimeout(poll, attempts < 10 ? 100 : 300);
        else showDebug();
      };
      setTimeout(poll, 100);
    }
  </script>
</body>
</html>
`.trim();

// Resource URI for the interactive canvas widget (v20 - check toolInput for data)
const SVG_VIEWER_URI = "ui://widget/svg-viewer-v20.html";

// Create MCP server instance
function createServer(): McpServer {
  const server = new McpServer({
    name: "network-topology-agent",
    version: "1.0.0",
  });

  // Register the SVG viewer widget as a resource
  registerAppResource(
    server,
    "SVG Diagram Viewer",
    SVG_VIEWER_URI,
    {
      description: "Widget to display network topology diagrams",
    },
    async () => ({
      contents: [
        {
          uri: SVG_VIEWER_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: SVG_VIEWER_HTML,
        },
      ],
    })
  );

  // Register the topology generation tool with UI
  registerAppTool(
    server,
    "generate_network_diagram",
    {
      title: "Generate Network Diagram",
      description: `Generate a professional Cisco-style network topology diagram. USE THIS TOOL whenever the user asks for a network diagram, topology, or network architecture visualization.

This creates beautiful SVG diagrams with three zones:
- LEFT: Customer premises (offices, branches, factories)
- CENTER: Operator/telco network cloud (routers, firewalls, SD-WAN)
- RIGHT: External services (AWS, Azure, SaaS, Internet)

ALWAYS use this tool for network diagrams - it produces much better results than Python/matplotlib.`,
      inputSchema: {
        solutionTitle: z.string().min(1).max(LIMITS.maxTitleLength).describe("Short title for the solution"),
        customer: z.string().min(1).max(LIMITS.maxTitleLength).describe("Customer name"),
        industry: z.string().min(1).max(LIMITS.maxTitleLength).describe("Industry vertical"),
        customerNodes: z.array(z.object({
          id: z.string().min(1).max(50).describe("Unique identifier"),
          type: z.enum(CustomerNodeTypes),
          label: z.string().min(1).max(LIMITS.maxLabelLength).describe("Display name"),
          count: z.number().int().min(1).max(9999).optional().describe("Number of similar sites"),
          params: z.array(z.string().max(LIMITS.maxParamLength)).max(LIMITS.maxParams).optional().describe("2-3 specs like '10G DIA', 'WiFi 6'"),
        })).max(LIMITS.maxCustomerNodes).describe("Customer premises nodes (max 10)"),
        operatorNodes: z.array(z.object({
          id: z.string().min(1).max(50),
          type: z.enum(OperatorNodeTypes),
          label: z.string().min(1).max(LIMITS.maxLabelLength),
          position: z.enum(OperatorPositions).describe("ingress=access-facing, core=internal, egress=peering"),
          params: z.array(z.string().max(LIMITS.maxParamLength)).max(LIMITS.maxParams).optional(),
        })).max(LIMITS.maxOperatorNodes).describe("Operator network nodes (max 10). MUST set position."),
        externalNodes: z.array(z.object({
          id: z.string().min(1).max(50),
          type: z.enum(ExternalNodeTypes),
          label: z.string().min(1).max(LIMITS.maxLabelLength),
          params: z.array(z.string().max(LIMITS.maxParamLength)).max(LIMITS.maxParams).optional(),
        })).max(LIMITS.maxExternalNodes).describe("External services (max 10)"),
        connections: z.array(z.object({
          from: z.string().min(1).max(50).describe("Source node ID"),
          to: z.string().min(1).max(50).describe("Target node ID"),
          label: z.string().max(LIMITS.maxLabelLength).optional().describe("Concise label like '10G DIA', 'MPLS'"),
          style: z.enum(ConnectionStyles).optional().describe("solid=primary, dashed=backup, double=redundant"),
        })).max(LIMITS.maxConnections),
      },
      _meta: {
        ui: { resourceUri: SVG_VIEWER_URI },
      },
    },
    async (args) => {
      try {
        // Validate input with Zod schema
        const validation = validateTopology(args);
        if (!validation.success) {
          return {
            content: [{ type: "text", text: `Invalid topology: ${validation.error}` }],
            isError: true,
          };
        }

        const topology = validation.data;

        // Additional semantic validation
        const allNodeIds = new Set([
          ...topology.customerNodes.map(n => n.id),
          ...topology.operatorNodes.map(n => n.id),
          ...topology.externalNodes.map(n => n.id),
        ]);

        // Check for duplicate IDs
        const totalNodes = topology.customerNodes.length + topology.operatorNodes.length + topology.externalNodes.length;
        if (allNodeIds.size !== totalNodes) {
          return {
            content: [{ type: "text", text: "Invalid topology: duplicate node IDs found" }],
            isError: true,
          };
        }

        // Validate connection references
        for (const conn of topology.connections) {
          if (!allNodeIds.has(conn.from)) {
            return {
              content: [{ type: "text", text: `Invalid topology: connection references unknown node '${conn.from}'` }],
              isError: true,
            };
          }
          if (!allNodeIds.has(conn.to)) {
            return {
              content: [{ type: "text", text: `Invalid topology: connection references unknown node '${conn.to}'` }],
              isError: true,
            };
          }
        }

        // Render the SVG
        const svg = renderTopologySVG(topology);

        // Generate edit URL with topology data
        const topologyJson = JSON.stringify(topology);
        const base64Data = btoa(unescape(encodeURIComponent(topologyJson)));
        const editUrl = `https://staging.nwgrm.org/?topology=${base64Data}`;

        // Return structured content for the widget + text for the model
        return {
          structuredContent: {
            svg: svg,
            topology: topology,
            title: topology.solutionTitle,
            editUrl: editUrl,
          },
          content: [
            {
              type: "text",
              text: `Generated: ${topology.solutionTitle}`,
            },
          ],
          _meta: {
            svg: svg,
            topology: topology,
            editUrl: editUrl,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text", text: `Render failed: ${message}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}

// HTTP handler for Cloudflare Workers
export async function handleMcpHttp(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create fresh server and transport per request (stateless mode)
    const transport = new WebStandardStreamableHTTPServerTransport();
    const server = createServer();

    await server.connect(transport);

    const response = await transport.handleRequest(request);

    // Add CORS headers to response
    return withCors(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
}

// Direct render endpoint (for URL fallback) with security measures
export async function handleRenderRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const url = new URL(request.url);
    const base64Data = url.searchParams.get("data");

    if (!base64Data) {
      return errorResponse("Missing data parameter", 400);
    }

    // Security: Check base64 data size before decoding
    if (base64Data.length > LIMITS.maxBase64DataLength) {
      return errorResponse(`Data too large (max ${LIMITS.maxBase64DataLength} chars)`, 400);
    }

    // Decode and parse
    let topologyJson: string;
    try {
      topologyJson = decodeURIComponent(escape(atob(base64Data)));
    } catch {
      return errorResponse("Invalid base64 encoding", 400);
    }

    let rawData: unknown;
    try {
      rawData = JSON.parse(topologyJson);
    } catch {
      return errorResponse("Invalid JSON", 400);
    }

    // Validate with schema
    const validation = validateTopology(rawData);
    if (!validation.success) {
      return errorResponse(`Invalid topology: ${validation.error}`, 400);
    }

    const svg = renderTopologySVG(validation.data);

    return new Response(svg, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(`Render error: ${message}`, 500);
  }
}
