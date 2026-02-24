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
} from "./schemas";
import { corsHeaders, withCors, errorResponse } from "./cors";

// HTML widget with interactive canvas - drag nodes, edit labels, export SVG
const SVG_VIEWER_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --color-bg: #ffffff;
      --color-bg-soft: #f8fafc;
      --color-text: #0F172A;
      --color-text-secondary: #475569;
      --color-text-muted: #94A3B8;
      --color-text-faint: #CBD5E1;
      --color-border: #e2e8f0;
      --color-border-hover: #cbd5e1;
      --color-chip-bg: #F1F5F9;
      --color-chip-text: #334155;
      --color-accent: #3b82f6;
      --color-accent-bg: rgba(59,130,246,0.1);
      --color-op-fill: rgba(79,70,229,0.03);
      --color-op-stroke: rgba(99,102,241,0.18);
      --color-op-label: #6366F1;
      --color-shadow: rgba(0,0,0,0.15);
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    }
    .dark-mode {
      --color-bg: #171717;
      --color-bg-soft: #262626;
      --color-text: #fafafa;
      --color-text-secondary: #a3a3a3;
      --color-text-muted: #737373;
      --color-text-faint: #525252;
      --color-border: #404040;
      --color-border-hover: #525252;
      --color-chip-bg: #262626;
      --color-chip-text: #d4d4d4;
      --color-accent: #60a5fa;
      --color-accent-bg: rgba(96,165,250,0.15);
      --color-op-fill: rgba(129,140,248,0.08);
      --color-op-stroke: rgba(129,140,248,0.25);
      --color-op-label: #a5b4fc;
      --color-shadow: rgba(0,0,0,0.4);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; }
    body { font-family: var(--font-sans); background: var(--color-bg); color: var(--color-text); }
    .container { width: 100%; padding: 8px; }
    .toolbar { display: flex; gap: 6px; margin-bottom: 8px; align-items: center; flex-wrap: wrap; }
    .toolbar button {
      padding: 8px 14px; border-radius: 6px; border: 1px solid var(--color-border);
      background: var(--color-bg); color: var(--color-text-secondary); font-size: 13px; cursor: pointer;
      font-family: var(--font-mono); transition: all 0.2s;
      min-height: 44px; min-width: 44px; /* MOB-002: Touch target size */
    }
    .toolbar button:hover { background: var(--color-bg-soft); border-color: var(--color-border-hover); }
    .toolbar button.active { background: var(--color-accent-bg); border-color: var(--color-accent); color: var(--color-accent); }
    .toolbar .zoom-group { display: flex; gap: 2px; align-items: center; }
    .toolbar .zoom-group button { padding: 8px 12px; font-size: 16px; font-weight: bold; min-width: 44px; }
    .toolbar .hint { font-size: 11px; color: var(--color-text-muted); margin-left: auto; }
    .canvas { width: 100%; overflow: auto; border-radius: 8px; background: var(--color-bg-soft); border: 1px solid var(--color-border); position: relative; }
    .canvas svg { display: block; cursor: default; }
    .canvas.edit-mode svg { cursor: grab; }
    .canvas.dragging svg { cursor: grabbing; }
    .loading { color: var(--color-text-muted); padding: 32px; text-align: center; }
    .edit-input {
      position: fixed; padding: 4px 8px; border: 2px solid var(--color-accent);
      border-radius: 4px; background: var(--color-bg); color: var(--color-text); font-size: 12px;
      font-family: var(--font-sans); outline: none; text-align: center;
      box-shadow: 0 4px 12px var(--color-shadow); z-index: 1000; min-width: 120px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="toolbar">
      <button id="editBtn" onclick="window.toggleEdit()" aria-label="Edit diagram layout" aria-pressed="false"><span aria-hidden="true">✎</span> Edit</button>
      <div class="zoom-group" role="group" aria-label="Zoom controls">
        <button onclick="window.zoomOut()" aria-label="Zoom out">−</button>
        <span id="zoomLevel" style="min-width:45px;text-align:center;font-size:12px;color:var(--color-text-secondary)">100%</span>
        <button onclick="window.zoomIn()" aria-label="Zoom in">+</button>
      </div>
      <button onclick="window.exportSVG()" aria-label="Save diagram as image"><span aria-hidden="true">💾</span> Save</button>
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
    var isDarkMode = false;

    // UX-001: Undo/Redo history (use undoStack to avoid conflict with window.history)
    var undoStack = [];
    var undoIndex = -1;

    function saveState() {
      // Remove any future states if we're not at the end
      undoStack.splice(undoIndex + 1);
      // Save current state
      undoStack.push(JSON.parse(JSON.stringify({ overrides: overrides, topology: topology })));
      undoIndex = undoStack.length - 1;
      // Limit history to 50 entries
      if (undoStack.length > 50) {
        undoStack.shift();
        undoIndex--;
      }
    }

    function undo() {
      if (undoIndex > 0) {
        undoIndex--;
        var state = undoStack[undoIndex];
        overrides = JSON.parse(JSON.stringify(state.overrides));
        topology = JSON.parse(JSON.stringify(state.topology));
        renderSVG();
        announceStatus('Undo');
      }
    }

    function redo() {
      if (undoIndex < undoStack.length - 1) {
        undoIndex++;
        var state = undoStack[undoIndex];
        overrides = JSON.parse(JSON.stringify(state.overrides));
        topology = JSON.parse(JSON.stringify(state.topology));
        renderSVG();
        announceStatus('Redo');
      }
    }

    // A11Y: Screen reader announcements
    var statusEl = null;
    function announceStatus(message) {
      if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.setAttribute('aria-live', 'polite');
        statusEl.setAttribute('aria-atomic', 'true');
        statusEl.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
        document.body.appendChild(statusEl);
      }
      statusEl.textContent = message;
    }

    // MOB-001: Touch detection
    var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Theme colors - updated dynamically based on dark/light mode
    var TLight = {
      bg:'#FFFFFF',text:'#0F172A',ts:'#475569',tm:'#94A3B8',tf:'#CBD5E1',
      bdr:'#E2E8F0',cl:'#334155',clbg:'#F1F5F9',
      opFill:'rgba(79,70,229,0.03)',opStroke:'rgba(99,102,241,0.18)',opLabel:'#6366F1',
      sel:'rgba(59,130,246,0.08)',selStroke:'#3B82F6'
    };
    var TDark = {
      bg:'#171717',text:'#fafafa',ts:'#a3a3a3',tm:'#737373',tf:'#525252',
      bdr:'#404040',cl:'#d4d4d4',clbg:'#262626',
      opFill:'rgba(129,140,248,0.08)',opStroke:'rgba(129,140,248,0.25)',opLabel:'#a5b4fc',
      sel:'rgba(96,165,250,0.15)',selStroke:'#60a5fa'
    };
    var T = TLight;

    function updateTheme() {
      var theme = (typeof window.openai === 'object' && window.openai) ? window.openai.theme : null;
      isDarkMode = theme === 'dark';
      document.body.classList.toggle('dark-mode', isDarkMode);
      T = isDarkMode ? TDark : TLight;
      if (topology) renderSVG();
    }

    updateTheme();
    window.addEventListener('openai:set_globals', updateTheme);
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

      // Ensure arrays exist with defaults
      const custNodes = data.customerNodes || [];
      const opNodes = data.operatorNodes || [];
      const extNodes = data.externalNodes || [];

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

      col(custNodes, custColX + custColW/2, 'customer');
      col(opNodes.filter(n=>n.position==='ingress'), opInX, 'op_in');
      col(opNodes.filter(n=>n.position==='core'), opCoreX, 'op_core');
      col(opNodes.filter(n=>n.position==='egress'), opEgX, 'op_eg');
      col(extNodes, extColX + extColW/2, 'external');

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
      var allNodes = (topology.customerNodes||[]).concat(topology.operatorNodes||[]).concat(topology.externalNodes||[]);

      // Font sizes scaled
      var fs = { title: 22 * s, subtitle: 13 * s, zone: 10 * s, label: 14 * s, param: 11 * s, conn: 10 * s, footer: 9 * s };

      var fontSans = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
      var fontMono = "ui-monospace,SFMono-Regular,Menlo,Monaco,monospace";
      // A11Y-001: SVG with role, aria-label, and title for screen readers
      var diagramTitle = topology.solutionTitle || 'Network Topology';
      var svg = '<svg width="100%" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="font-family:' + fontSans + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Network diagram: ' + diagramTitle + '">';
      svg += '<title>' + diagramTitle + '</title>';

      // Background with theme-aware colors
      const gridSize = 20 * s;
      svg += \`<defs><pattern id="grid" width="\${gridSize}" height="\${gridSize}" patternUnits="userSpaceOnUse"><circle cx="\${gridSize/2}" cy="\${gridSize/2}" r="\${0.5*s}" fill="\${T.tf}" opacity="0.3"/></pattern></defs>\`;
      svg += \`<rect width="\${w}" height="\${h}" fill="\${T.bg}"/>\`;
      svg += \`<rect width="\${w}" height="\${h}" fill="url(#grid)" opacity="0.5"/>\`;

      // Title
      svg += \`<text x="\${w/2}" y="\${35*s}" text-anchor="middle" fill="\${T.text}" font-size="\${fs.title}" font-weight="700" data-field="solutionTitle" style="cursor:pointer">\${topology.solutionTitle}</text>\`;
      svg += \`<text x="\${w/2}" y="\${55*s}" text-anchor="middle" fill="\${T.tm}" font-size="\${fs.subtitle}" font-family="' + fontMono + '">\${topology.customer} · \${topology.industry}</text>\`;

      // Zone labels
      svg += \`<text x="\${custColX+custColW/2}" y="\${pad.t-18*s}" text-anchor="middle" fill="\${T.tf}" font-size="\${fs.zone}" font-family="' + fontMono + '" letter-spacing="2" font-weight="600">CUSTOMER PREMISES</text>\`;
      svg += \`<text x="\${opCX}" y="\${pad.t-18*s}" text-anchor="middle" fill="\${T.opLabel}" font-size="\${fs.zone}" font-family="' + fontMono + '" letter-spacing="2" font-weight="600">OPERATOR NETWORK</text>\`;
      svg += \`<text x="\${extColX+extColW/2}" y="\${pad.t-18*s}" text-anchor="middle" fill="\${T.tf}" font-size="\${fs.zone}" font-family="' + fontMono + '" letter-spacing="2" font-weight="600">EXTERNAL SERVICES</text>\`;

      // Operator cloud
      svg += \`<path d="\${cloudPath(opCX, opCY, opW+80*s, opCloudH)}" fill="\${T.opFill}" stroke="\${T.opStroke}" stroke-width="\${2.5*s}" stroke-dasharray="\${10*s},\${6*s}"/>\`;

      // Connections - Only render when we're confident ALL connections have arrived
      // This requires EITHER: tool-result fired OR connection count has stabilized
      const nodeIdSet = new Set(Object.keys(layout.pos));
      const currentConnCount = (topology.connections || []).length;
      const validConns = (topology.connections || []).filter(c => c?.from && c?.to).length;

      // Track connection count stability
      if (currentConnCount === lastConnectionCount && currentConnCount > 0) {
        connectionCountStableFor++;
      } else {
        connectionCountStableFor = 0;
        lastConnectionCount = currentConnCount;
      }

      // Determine if we should render connections now
      // MUST wait for: (1) tool-result received, OR (2) count stable for 3+ checks
      // Do NOT render just because current connections are valid - more may be coming!
      const shouldRenderConnections = toolResultReceived || connectionCountStableFor >= 3;

      console.log('Connection check: count=' + currentConnCount + ', valid=' + validConns +
                  ', stable=' + connectionCountStableFor + ', toolResult=' + toolResultReceived);

      if (!shouldRenderConnections) {
        console.log('=== SKIPPING CONNECTIONS (waiting for stability) ===');
        console.log('Nodes ready:', nodeIdSet.size, '| Connections so far:', currentConnCount);

        // Schedule a re-check to wait for more connections
        if (!window._connectionRetryPending) {
          window._connectionRetryPending = true;
          setTimeout(() => {
            window._connectionRetryPending = false;
            // Re-read fresh data from window.openai
            const freshData = tryGetData(window.openai);
            if (freshData) {
              console.log('=== RETRY: Re-checking connections ===');
              topology = freshData;
              renderSVG();
            }
          }, 400);
        }
      } else {
        console.log('=== RENDERING CONNECTIONS (stable/complete) ===');
        console.log('Layout node IDs:', Array.from(nodeIdSet));

        // Filter valid connections first
        const validConnections = (topology.connections||[]).filter((conn, idx) => {
          if (!conn || typeof conn.from !== 'string' || typeof conn.to !== 'string') {
            console.warn('SKIP connection', idx, '- malformed:', JSON.stringify(conn));
            return false;
          }
          if (!nodeIdSet.has(conn.from) || !nodeIdSet.has(conn.to)) {
            console.warn('SKIP connection', idx, conn.from, '->', conn.to, '| from exists:', nodeIdSet.has(conn.from), 'to exists:', nodeIdSet.has(conn.to));
            return false;
          }
          return true;
        });
        console.log('Valid connections:', validConnections.length, '/', (topology.connections||[]).length);

        validConnections.forEach((conn, idx) => {
        const f = getPos(conn.from, layout), t = getPos(conn.to, layout);
        if (!f || !t) return; // Shouldn't happen after filter, but safety check
        console.log('DRAW connection', idx, conn.from, '->', conn.to);
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
          svg += \`<text x="\${mx}" y="\${my+4*s}" text-anchor="middle" fill="\${T.cl}" font-size="\${fs.conn}" font-family="' + fontMono + '" font-weight="500" data-conn="\${idx}" style="cursor:pointer">\${conn.label}</text>\`;
        }
      });
      } // End of connectionsComplete check

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
          svg += \`<text x="\${p.cx}" y="\${ly+15*s+i*14*s}" text-anchor="middle" fill="\${T.ts}" font-size="\${fs.param}" font-family="' + fontMono + '" opacity="0.7" data-param="\${nd.id}-\${i}" style="cursor:pointer">\${pr}</text>\`;
        });
        svg += \`</g>\`;
      });

      // Footer labels
      svg += \`<text x="\${opLeft}" y="\${h-pad.b+25*s}" text-anchor="middle" fill="\${T.opLabel}" font-size="\${fs.footer}" font-family="' + fontMono + '" letter-spacing="1.5" opacity="0.5">▸ INGRESS</text>\`;
      svg += \`<text x="\${opRight}" y="\${h-pad.b+25*s}" text-anchor="middle" fill="\${T.opLabel}" font-size="\${fs.footer}" font-family="' + fontMono + '" letter-spacing="1.5" opacity="0.5">EGRESS ▸</text>\`;

      if (editMode) svg += \`<text x="\${w-15*s}" y="\${h-12*s}" text-anchor="end" fill="\${T.tm}" font-size="\${fs.param}" font-family="' + fontMono + '" opacity="0.5">Drag to move · Double-click to edit</text>\`;

      svg += \`</svg>\`;
      canvas.innerHTML = svg;
      svgEl = canvas.querySelector('svg');
      attachEventHandlers();

      // Notify ChatGPT of widget height for proper sizing
      if (typeof window.openai?.notifyIntrinsicHeight === 'function') {
        try {
          window.openai.notifyIntrinsicHeight(canvas.scrollHeight + 100);
        } catch (e) { console.warn('notifyIntrinsicHeight failed:', e); }
      }

      console.log('renderSVG complete');
      } catch(e) { console.error('renderSVG error:', e); }
    }

    function attachEventHandlers() {
      if (!svgEl) return;
      const w = 1600 * scale, h = 900 * scale;
      const layout = computeLayout(topology, w, h, scale);

      // Drag handlers (only in edit mode) - mouse and touch
      if (editMode) {
        svgEl.querySelectorAll('[data-node]').forEach(g => {
          const nodeId = g.dataset.node;

          // Mouse drag
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

          // MOB-001: Touch drag
          g.addEventListener('touchstart', function(e) {
            if (e.target.closest('[data-label]') || e.target.closest('[data-param]')) return;
            e.preventDefault();
            var touch = e.touches[0];
            var pt = svgEl.createSVGPoint();
            pt.x = touch.clientX; pt.y = touch.clientY;
            var svgPt = pt.matrixTransform(svgEl.getScreenCTM().inverse());
            var p = getPos(nodeId, layout);
            dragState = { nodeId, offsetX: svgPt.x - p.cx, offsetY: svgPt.y - p.cy };
            canvas.classList.add('dragging');
          }, { passive: false });
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
        if (saveCallback && val) {
          saveCallback(val);
          saveState(); // UX-001: Save state after text edit for undo
        }
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
      // MOB-004: Use fixed viewBox dimensions (1600x900), not scaled
      const w = 1600, h = 900;
      const layout = computeLayout(topology, w, h, scale);
      const pt = svgEl.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const svgPt = pt.matrixTransform(svgEl.getScreenCTM().inverse());
      const base = layout.pos[dragState.nodeId];
      if (!base) return;

      // UX-004: Calculate desired new center position
      var desiredCx = svgPt.x - dragState.offsetX;
      var desiredCy = svgPt.y - dragState.offsetY;

      // UX-004: Bounds checking - clamp node center within viewBox
      // Keep node fully visible (account for node size + small padding)
      var iW = layout.iW, iH = layout.iH;
      var minX = iW / 2 + 10;
      var maxX = 1600 - iW / 2 - 10;
      var minY = iH / 2 + 10;
      var maxY = 900 - iH / 2 - 30; // Extra padding at bottom for labels

      var clampedCx = Math.max(minX, Math.min(maxX, desiredCx));
      var clampedCy = Math.max(minY, Math.min(maxY, desiredCy));

      overrides[dragState.nodeId] = {
        dx: clampedCx - base.cx,
        dy: clampedCy - base.cy
      };
      renderSVG();
    });

    document.addEventListener('mouseup', () => {
      if (dragState) {
        saveState(); // UX-001: Save state after drag for undo
      }
      dragState = null;
      canvas.classList.remove('dragging');
    });

    // MOB-001: Touch event handlers for drag
    // UX-004: Touch drag also has bounds checking
    document.addEventListener('touchmove', function(e) {
      if (!dragState || !svgEl || !editMode) return;
      e.preventDefault();
      var touch = e.touches[0];
      // MOB-004: Use fixed viewBox dimensions (1600x900), not scaled
      var w = 1600, h = 900;
      var layout = computeLayout(topology, w, h, scale);
      var pt = svgEl.createSVGPoint();
      pt.x = touch.clientX; pt.y = touch.clientY;
      var svgPt = pt.matrixTransform(svgEl.getScreenCTM().inverse());
      var base = layout.pos[dragState.nodeId];
      if (!base) return;

      // UX-004: Calculate desired new center position
      var desiredCx = svgPt.x - dragState.offsetX;
      var desiredCy = svgPt.y - dragState.offsetY;

      // UX-004: Bounds checking - clamp node center within viewBox
      var iW = layout.iW, iH = layout.iH;
      var minX = iW / 2 + 10;
      var maxX = 1600 - iW / 2 - 10;
      var minY = iH / 2 + 10;
      var maxY = 900 - iH / 2 - 30; // Extra padding at bottom for labels

      var clampedCx = Math.max(minX, Math.min(maxX, desiredCx));
      var clampedCy = Math.max(minY, Math.min(maxY, desiredCy));

      overrides[dragState.nodeId] = {
        dx: clampedCx - base.cx,
        dy: clampedCy - base.cy
      };
      renderSVG();
    }, { passive: false });

    document.addEventListener('touchend', function() {
      if (dragState) {
        saveState(); // UX-001: Save state after touch drag
      }
      dragState = null;
      canvas.classList.remove('dragging');
    });

    // UX-002: Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      // Check for Cmd (Mac) or Ctrl (Windows)
      var isMod = e.metaKey || e.ctrlKey;

      if (isMod) {
        switch(e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            window.exportSVG();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case '=':
          case '+':
            e.preventDefault();
            window.zoomIn();
            break;
          case '-':
            e.preventDefault();
            window.zoomOut();
            break;
        }
      }

      if (e.key === 'Escape') {
        if (activeInput) {
          activeInput.remove();
          activeInput = null;
        } else if (editMode) {
          window.toggleEdit();
        }
      }
    });

    // Global functions for button onclick handlers
    window.toggleEdit = function() {
      editMode = !editMode;
      editBtn.classList.toggle('active', editMode);
      editBtn.setAttribute('aria-pressed', editMode ? 'true' : 'false');
      editBtn.innerHTML = editMode ? '<span aria-hidden="true">✓</span> Editing' : '<span aria-hidden="true">✎</span> Edit';
      hint.textContent = editMode ? 'Drag nodes · Double-click to edit' : 'Double-click text to edit';
      canvas.classList.toggle('edit-mode', editMode);
      announceStatus(editMode ? 'Edit mode enabled' : 'Edit mode disabled');
      renderSVG();
    };

    function updateZoomDisplay() {
      var zoomEl = document.getElementById('zoomLevel');
      if (zoomEl) zoomEl.textContent = Math.round(scale * 100) + '%';
    }

    window.zoomIn = function() {
      scale = Math.min(scale + 0.15, 1.8);
      console.log('Zoom in, new scale:', scale);
      updateZoomDisplay();
      renderSVG();
    };

    window.zoomOut = function() {
      scale = Math.max(scale - 0.15, 0.7);
      console.log('Zoom out, new scale:', scale);
      updateZoomDisplay();
      renderSVG();
    };

    window.exportSVG = function() {
      if (!svgEl) { console.error('No SVG to export'); return; }
      try {
        var clone = svgEl.cloneNode(true);
        clone.style.transform = '';
        clone.setAttribute('width', '1600');
        clone.setAttribute('height', '900');
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        var bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('width', '100%');
        bgRect.setAttribute('height', '100%');
        bgRect.setAttribute('fill', isDarkMode ? '#171717' : '#ffffff');
        clone.insertBefore(bgRect, clone.firstChild);

        var svgData = new XMLSerializer().serializeToString(clone);
        console.log('v45: SVG data length:', svgData.length);

        // Get filename from diagram title
        var filename = (topology?.solutionTitle || 'network-topology').replace(/[^a-zA-Z0-9-_ ]/g, '').trim() + '.png';

        // v45: Convert SVG to PNG for reliable mobile saving
        // SVG data URIs don't work well with long-press save on mobile
        var canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 900;
        var ctx = canvas.getContext('2d');

        var tempImg = new Image();
        tempImg.onload = function() {
          ctx.drawImage(tempImg, 0, 0);
          var pngDataUri = canvas.toDataURL('image/png');
          console.log('v45: PNG converted, showing modal');
          showSaveModal(pngDataUri, filename);
        };
        tempImg.onerror = function() {
          console.error('v45: PNG conversion failed, falling back to SVG');
          var svgUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
          showSaveModal(svgUri, filename.replace('.png', '.svg'));
        };
        tempImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);

      } catch (e) {
        console.error('Export failed:', e);
      }
    };

    function showSaveModal(dataUri, filename) {
      var modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box';

      var img = document.createElement('img');
      img.src = dataUri;
      img.alt = filename;
      // MOB-003: Show appropriate hint based on device type
      var saveHint = isTouchDevice ? 'Long-press to save image' : 'Right-click → Save Image As';
      img.title = saveHint;
      // MOB-005: Better mobile sizing - use width:100% with max constraints
      img.style.cssText = 'width:100%;max-width:800px;max-height:70vh;object-fit:contain;background:#fff;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.4);cursor:context-menu';

      // Filename label - so user knows what to name the file
      var filenameLabel = document.createElement('div');
      filenameLabel.style.cssText = 'margin-top:12px;padding:8px 16px;background:rgba(255,255,255,0.1);border-radius:6px;font-family:ui-monospace,monospace;font-size:13px;color:#fff;user-select:all;cursor:text;max-width:90%;overflow:hidden;text-overflow:ellipsis';
      filenameLabel.textContent = filename;
      filenameLabel.title = 'Suggested filename';

      // MOB-003: Visual hint text for save instructions
      var hintText = document.createElement('div');
      hintText.style.cssText = 'margin-top:8px;font-size:14px;color:rgba(255,255,255,0.8);text-align:center;font-weight:500';
      hintText.textContent = isTouchDevice ? 'Long-press image to save' : 'Right-click image to save';

      var closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;width:44px;height:44px;background:rgba(255,255,255,0.15);border:none;border-radius:50%;font-size:20px;color:#fff;cursor:pointer';
      closeBtn.onmouseenter = function() { closeBtn.style.background = 'rgba(255,255,255,0.25)'; };
      closeBtn.onmouseleave = function() { closeBtn.style.background = 'rgba(255,255,255,0.15)'; };
      closeBtn.onclick = function() { modal.remove(); };

      modal.appendChild(img);
      modal.appendChild(filenameLabel);
      modal.appendChild(hintText);
      modal.appendChild(closeBtn);
      modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
      document.body.appendChild(modal);

      // MOB-003: Device-appropriate screen reader announcement
      announceStatus((isTouchDevice ? 'Long-press' : 'Right-click') + ' image to save as ' + filename);
      console.log('v45: Modal shown, touch=' + isTouchDevice + ', filename:', filename);
    }

    // Data loading - try many possible locations
    function isValidTopology(data) {
      return data && data.customerNodes && data.operatorNodes && data.externalNodes && data.connections;
    }

    // Check if connections are fully populated (not empty objects)
    function hasValidConnections(data) {
      if (!data?.connections?.length) return false;
      return data.connections.every(c => c && typeof c.from === 'string' && typeof c.to === 'string');
    }

    // Try to extract topology from editUrl (base64 encoded)
    function tryDecodeFromUrl(obj) {
      // Try multiple paths to find editUrl
      var editUrl = obj?.toolResponseMetadata?.editUrl
        || obj?.toolOutput?.editUrl
        || obj?._meta?.editUrl
        || obj?.structuredContent?.editUrl;

      console.log('tryDecodeFromUrl - checking paths:', {
        toolResponseMetadata: !!obj?.toolResponseMetadata?.editUrl,
        toolOutput: !!obj?.toolOutput?.editUrl,
        _meta: !!obj?._meta?.editUrl,
        structuredContent: !!obj?.structuredContent?.editUrl,
        foundUrl: !!editUrl
      });

      if (!editUrl) return null;
      try {
        var match = editUrl.match(/[?&]topology=([^&]+)/);
        if (match) {
          var decoded = decodeURIComponent(escape(atob(match[1])));
          var data = JSON.parse(decoded);
          if (isValidTopology(data)) {
            console.log('SUCCESS: Decoded complete topology from editUrl');
            console.log('Connections from editUrl:', data.connections?.length);
            return data;
          }
        }
      } catch (e) {
        console.warn('Failed to decode from editUrl:', e);
      }
      return null;
    }

    function tryGetData(obj) {
      if (!obj) return null;

      // PRIORITY 1: toolOutput.topology - complete validated data from server response
      // This is populated AFTER streaming completes, so connections are always complete
      if (obj.toolOutput?.topology && isValidTopology(obj.toolOutput.topology)) {
        console.log('SUCCESS: Found complete topology in toolOutput.topology');
        console.log('Connections:', obj.toolOutput.topology.connections?.length);
        return obj.toolOutput.topology;
      }

      // PRIORITY 2: Try to decode from editUrl (backup in _meta or toolOutput)
      var fromUrl = tryDecodeFromUrl(obj);
      if (fromUrl && hasValidConnections(fromUrl)) {
        console.log('SUCCESS: Decoded topology from editUrl');
        return fromUrl;
      }

      // PRIORITY 3: Direct topology object (rare, but handle it)
      if (isValidTopology(obj) && hasValidConnections(obj)) {
        console.log('Found direct topology object');
        return obj;
      }

      // PRIORITY 4: toolInput - ONLY if connections are complete
      // toolInput is what ChatGPT passes TO the tool - may be incomplete during streaming
      if (obj.toolInput && isValidTopology(obj.toolInput) && hasValidConnections(obj.toolInput)) {
        console.log('Found complete topology in toolInput');
        return obj.toolInput;
      }

      // Check other nested locations (legacy paths)
      var checks = [
        ['toolResponseMetadata', 'topology'],
        ['structuredContent', 'topology'],
        ['data']
      ];
      for (var i = 0; i < checks.length; i++) {
        var path = checks[i];
        var val = obj;
        for (var j = 0; j < path.length; j++) {
          val = val && val[path[j]];
        }
        if (isValidTopology(val) && hasValidConnections(val)) {
          console.log('Found topology in', path.join('.'));
          return val;
        }
      }

      // FALLBACK: Return partial toolInput for progress display (streaming in progress)
      if (obj.toolInput && isValidTopology(obj.toolInput)) {
        console.log('Found PARTIAL topology in toolInput (streaming in progress)');
        return obj.toolInput;
      }

      return null;
    }

    var initialized = false;
    var toolResultReceived = false;
    var lastConnectionCount = 0;
    var connectionCountStableFor = 0;

    // Show streaming progress while waiting for completion
    function showProgress(data) {
      const custNodes = (data?.customerNodes || []).length;
      const opNodes = (data?.operatorNodes || []).length;
      const extNodes = (data?.externalNodes || []).length;
      const conns = (data?.connections || []).length;
      const title = data?.solutionTitle || 'Network Diagram';

      const dots = '<span class="dots"><span>.</span><span>.</span><span>.</span></span>';
      const progress = custNodes + opNodes + extNodes > 0
        ? '<div style="margin-top:12px;font-size:12px;color:' + T.ts + '">' +
          '<div style="display:flex;gap:16px;justify-content:center">' +
          '<span>Nodes: ' + (custNodes + opNodes + extNodes) + '</span>' +
          '<span>Connections: ' + conns + '</span>' +
          '</div></div>'
        : '';

      canvas.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;padding:32px">' +
        '<style>.dots span{animation:blink 1.4s infinite;opacity:0}.dots span:nth-child(2){animation-delay:0.2s}.dots span:nth-child(3){animation-delay:0.4s}@keyframes blink{0%,100%{opacity:0}50%{opacity:1}}</style>' +
        '<div style="font-size:16px;font-weight:600;color:' + T.text + '">Generating ' + title + dots + '</div>' +
        progress +
        '<div style="margin-top:16px;font-size:11px;color:' + T.tm + '">Waiting for ChatGPT to complete</div>' +
        '</div>';

      if (typeof window.openai?.notifyIntrinsicHeight === 'function') {
        try { window.openai.notifyIntrinsicHeight(250); } catch(e) {}
      }
    }

    function tryLoad() {
      if (initialized) return true;
      if (typeof window.openai !== 'object' || !window.openai) return false;
      const openai = window.openai;
      const data = tryGetData(openai);
      if (data) {
        initialized = true;
        topology = data;
        // Always render immediately - nodes show during streaming, connections only after tool-result
        console.log('Data loaded, rendering SVG (toolResultReceived:', toolResultReceived + ')');
        renderSVG();
        saveState(); // UX-001: Save initial state for undo
        return true;
      }
      return false;
    }

    // Listen for JSON-RPC notifications from ChatGPT
    window.addEventListener('message', (event) => {
      const msg = event.data;

      // Check for tool-result completion signal (JSON-RPC notification)
      if (msg && msg.method === 'ui/notifications/tool-result') {
        console.log('=== TOOL-RESULT NOTIFICATION - Streaming complete ===');
        toolResultReceived = true;

        // Wait for connection count to STABILIZE before rendering
        // This ensures all connections have arrived, not just the first few
        function tryRefreshData(attempt) {
          const openai = window.openai || {};

          // Debug: Log window.openai structure
          console.log('=== DEBUG: window.openai attempt ' + attempt + ' ===');
          console.log('toolInput keys:', openai.toolInput ? Object.keys(openai.toolInput) : 'N/A');
          console.log('toolOutput keys:', openai.toolOutput ? Object.keys(openai.toolOutput) : 'N/A');

          var data = tryGetData(openai);

          if (data) {
            const validConns = (data.connections || []).filter(c => c?.from && c?.to).length;
            const totalConns = data.connections?.length || 0;
            console.log('Attempt ' + attempt + ': Connections=' + totalConns + ' (valid=' + validConns + '), lastCount=' + lastConnectionCount);

            // Check if connection count has stabilized
            if (totalConns === lastConnectionCount && totalConns > 0) {
              connectionCountStableFor++;
              console.log('Connection count stable for ' + connectionCountStableFor + ' checks');
            } else {
              connectionCountStableFor = 0;
              lastConnectionCount = totalConns;
            }

            topology = data;

            // Only render when count has been stable for 2+ checks OR we've tried 8+ times
            if (connectionCountStableFor >= 2 || attempt >= 8) {
              console.log('=== RENDERING: count stable or max attempts reached ===');
              console.log('  - Title:', data.solutionTitle);
              console.log('  - Nodes:', (data.customerNodes?.length || 0) + (data.operatorNodes?.length || 0) + (data.externalNodes?.length || 0));
              console.log('  - Final connections:', totalConns, '(valid:', validConns + ')');
              renderSVG();
            } else {
              // Keep waiting for more connections to arrive
              console.log('Waiting for connection count to stabilize, retry ' + (attempt + 1));
              setTimeout(() => tryRefreshData(attempt + 1), 250);
            }
          } else {
            console.error('FAILED: No valid topology data found (attempt ' + attempt + ')');
            if (attempt < 8) {
              setTimeout(() => tryRefreshData(attempt + 1), 250);
            }
          }
        }

        // Reset stability tracking and start retry sequence
        lastConnectionCount = 0;
        connectionCountStableFor = 0;
        setTimeout(() => tryRefreshData(1), 300);
        return;
      }

      // Handle streaming data updates - render with nodes (connections wait for tool-result)
      const data = tryGetData(msg);
      if (data) {
        topology = data;
        // Always render - nodes show immediately, connections only after tool-result
        renderSVG();
      }
    });

    function showDebug() {
      const openai = window.openai || {};
      const info = {
        hasOpenai: !!window.openai,
        keys: Object.keys(openai),
        toolInput: openai.toolInput ? Object.keys(openai.toolInput) : null,
        toolOutput: openai.toolOutput ? Object.keys(openai.toolOutput) : null,
        toolResponseMetadata: openai.toolResponseMetadata ? Object.keys(openai.toolResponseMetadata) : null,
        structuredContent: openai.structuredContent ? Object.keys(openai.structuredContent) : null,
        theme: openai.theme || null,
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

// Resource URI for the interactive canvas widget
// v39: Server-side download with proper filename via Content-Disposition header
// v38: P1 fixes - Undo/Redo, Keyboard shortcuts, Touch drag, SVG accessibility
// v37: Show filename label below image (selectable) so user knows what to name file
// v36: Clean modal (no text), filename from title, tooltip hint, X close button
// v35: Modal with data URI image - right-click to "Save Image As"
// v34: Copy SVG to clipboard (BLOCKED by sandbox permissions policy)
// v33: Fix iframe download (BLOCKED - sandbox lacks allow-downloads)
// v32: Direct SVG export (no modal dialog) - triggers browser save dialog immediately
// v31: Remove "all valid" shortcut - MUST wait for toolResult OR stable count
// v42: MOB-003 - Touch-friendly save modal (long-press hint for touch devices)
// v43: MOB-002 - Toolbar buttons minimum 44px touch targets
// v44: UX-004 - Nodes constrained within SVG viewBox (can't be dragged off-screen)
// v45: MOB-004 - Fix drag handler using wrong scaled dimensions (was 1600*scale, now 1600)
//      MOB-005 - Convert SVG to PNG for reliable mobile long-press save
const SVG_VIEWER_URI = "ui://widget/svg-viewer-v45-1740571200.html";

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
      description: `Generate a Cisco-style network topology diagram from a structured specification.

Creates SVG diagrams with three zones:
- Customer premises (offices, branches, factories)
- Operator network (routers, firewalls, SD-WAN)
- External services (cloud providers, SaaS, Internet)

Returns an interactive widget where users can drag nodes, edit labels, zoom, and export as PNG.`,
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
          from: z.string().min(1).max(50).describe("Source node ID - MUST exactly match a node's 'id' field"),
          to: z.string().min(1).max(50).describe("Target node ID - MUST exactly match a node's 'id' field"),
          label: z.string().max(LIMITS.maxLabelLength).optional().describe("Concise label like '10G DIA', 'MPLS'"),
          style: z.enum(ConnectionStyles).optional().describe("solid=primary, dashed=backup, double=redundant"),
        })).max(LIMITS.maxConnections).describe("Connections between nodes. CRITICAL: 'from' and 'to' must exactly match node 'id' values defined above."),
      },
      annotations: {
        readOnlyHint: true,  // Marks tool as read-only, not a "write action"
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
        const invalidConnections: string[] = [];
        for (const conn of topology.connections) {
          if (!allNodeIds.has(conn.from)) {
            invalidConnections.push(`'${conn.from}' (in connection ${conn.from} -> ${conn.to})`);
          }
          if (!allNodeIds.has(conn.to)) {
            invalidConnections.push(`'${conn.to}' (in connection ${conn.from} -> ${conn.to})`);
          }
        }
        if (invalidConnections.length > 0) {
          const availableIds = Array.from(allNodeIds).join(', ');
          return {
            content: [{
              type: "text",
              text: `Invalid topology: connections reference non-existent node IDs: ${invalidConnections.join(', ')}. Available node IDs are: ${availableIds}. IMPORTANT: Connection 'from' and 'to' must exactly match node 'id' values.`
            }],
            isError: true,
          };
        }

        // Validate rendering works (widget renders its own SVG from toolInput)
        renderTopologySVG(topology);

        // Return structured content for the widget + text for the model
        // NOTE: editUrl removed to avoid ChatGPT displaying long base64 URLs
        return {
          structuredContent: {
            topology: topology,  // Complete validated topology for the widget
          },
          content: [
            {
              type: "text",
              text: `Generated: ${topology.solutionTitle}`,
            },
          ],
          _meta: {
            // Required for widget rendering
            "openai/outputTemplate": SVG_VIEWER_URI,
            "openai/widgetAccessible": true,
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
    // Workaround: ChatGPT sends incomplete initialize params (missing capabilities/clientInfo)
    // MCP SDK v1.26.0 requires these fields, so we add defaults if missing
    let processedRequest = request;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.text();
      try {
        const json = JSON.parse(body);
        if (json.method === "initialize" && json.params) {
          // Add missing required fields for MCP SDK compatibility
          if (!json.params.capabilities) {
            json.params.capabilities = {};
          }
          if (!json.params.clientInfo) {
            json.params.clientInfo = { name: "chatgpt", version: "1.0" };
          }
          // Reconstruct request with patched body
          processedRequest = new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(json),
          });
        } else {
          // Non-initialize request, reconstruct with original body
          processedRequest = new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: body,
          });
        }
      } catch {
        // JSON parse failed, use original body
        processedRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: body,
        });
      }
    }

    // Fix for ChatGPT iOS: Add text/event-stream to Accept header if missing
    // ChatGPT iOS sends only "Accept: application/json" but MCP SDK requires
    // both "application/json" AND "text/event-stream", returning HTTP 406 otherwise
    const acceptHeader = processedRequest.headers.get("accept") || "";
    if (!acceptHeader.includes("text/event-stream")) {
      const fixedHeaders = new Headers(processedRequest.headers);
      fixedHeaders.set("accept", "application/json, text/event-stream");
      // Need to clone the body since Request bodies can only be read once
      const bodyForFixedRequest = await processedRequest.clone().text();
      processedRequest = new Request(processedRequest.url, {
        method: processedRequest.method,
        headers: fixedHeaders,
        body: bodyForFixedRequest || null,
      });
    }

    // Create fresh server and transport per request (stateless mode)
    // Use JSON response mode instead of SSE for better iOS compatibility
    const transport = new WebStandardStreamableHTTPServerTransport({
      enableJsonResponse: true,
    });
    const server = createServer();

    await server.connect(transport);

    const response = await transport.handleRequest(processedRequest);

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
