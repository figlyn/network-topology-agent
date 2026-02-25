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
    /* v61: Professional toolbar styling matching Cisco diagram aesthetic */
    .toolbar { display: flex; gap: 8px; margin-bottom: 10px; align-items: center; flex-wrap: wrap; padding: 6px; background: var(--color-bg-soft); border-radius: 8px; border: 1px solid var(--color-border); }
    .toolbar button {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      padding: 10px 16px; border-radius: 6px; border: 1.5px solid var(--color-border);
      background: var(--color-bg); color: var(--color-text-secondary); font-size: 13px; cursor: pointer;
      font-family: var(--font-mono); font-weight: 500; transition: all 0.15s ease;
      min-height: 44px; min-width: 44px;
    }
    .toolbar button svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .toolbar button:hover { background: var(--color-bg-soft); border-color: var(--color-accent); color: var(--color-text); box-shadow: 0 2px 8px var(--color-shadow); }
    .toolbar button:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
    .toolbar button.active { background: var(--color-accent-bg); border-color: var(--color-accent); color: var(--color-accent); font-weight: 600; }
    .toolbar button.active svg { stroke: var(--color-accent); }
    .toolbar .zoom-group { display: flex; gap: 0; align-items: center; background: var(--color-bg); border: 1.5px solid var(--color-border); border-radius: 6px; padding: 2px; }
    .toolbar .zoom-group button { padding: 8px 12px; border: none; border-radius: 4px; min-width: 40px; background: transparent; }
    .toolbar .zoom-group button:hover { background: var(--color-bg-soft); border-color: transparent; box-shadow: none; }
    .toolbar .zoom-group span { min-width: 52px; text-align: center; font-size: 12px; font-weight: 600; color: var(--color-text-secondary); }
    .toolbar .hint { font-size: 12px; color: var(--color-text-muted); margin-left: auto; opacity: 0.8; }
    @media (max-width: 500px) { .toolbar .hint { display: none; } }
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
      <button id="editBtn" onclick="window.toggleEdit()" aria-label="Edit diagram layout" aria-pressed="false" title="Edit mode: drag nodes, double-click to rename">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        <span>Edit</span>
      </button>
      <div class="zoom-group" role="group" aria-label="Zoom controls">
        <button onclick="window.zoomOut()" aria-label="Zoom out" title="Zoom out">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>
        <span id="zoomLevel">100%</span>
        <button onclick="window.zoomIn()" aria-label="Zoom in" title="Zoom in">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>
      </div>
      <button id="saveBtn" onclick="window.exportSVG()" aria-label="Save diagram as image" title="Save or share diagram">
        <svg id="saveBtnIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        <span id="saveBtnText">Save</span>
      </button>
      <span class="hint" id="hint"></span>
    </div>
    <div id="canvas" class="canvas"></div>
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

    // v60: Web Share API support - native share sheet on mobile
    // Sanitize filename from solution title
    function sanitizeFilename(title) {
      return (title || '')
        .replace(/[<>:"/\\\\|?*]/g, '')     // Remove invalid chars
        .replace(/\\s+/g, '-')               // Spaces to hyphens
        .replace(/-+/g, '-')                 // Collapse multiple hyphens
        .replace(/^-|-$/g, '')               // Trim hyphens
        .substring(0, 100)                   // Limit length
        .toLowerCase() || 'network-topology'; // Fallback
    }

    // v60: On touch devices, always show Share and try navigator.share() directly
    // Don't pre-check canShare() as it may be blocked in ChatGPT sandbox
    var hasShareAPI = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    var showShareButton = isTouchDevice && hasShareAPI;

    // v61: Update save button with SVG icon based on device type
    function updateSaveButton() {
      var saveBtnIcon = document.getElementById('saveBtnIcon');
      var saveBtnText = document.getElementById('saveBtnText');
      var saveBtn = document.getElementById('saveBtn');
      if (saveBtnIcon && saveBtnText && saveBtn) {
        if (showShareButton) {
          // Share icon (upload arrow with nodes)
          saveBtnIcon.innerHTML = '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>';
          saveBtnText.textContent = 'Share';
          saveBtn.setAttribute('aria-label', 'Share diagram');
          saveBtn.setAttribute('title', 'Share diagram via native share sheet');
        } else {
          // Save icon (floppy disk)
          saveBtnIcon.innerHTML = '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>';
          saveBtnText.textContent = 'Save';
          saveBtn.setAttribute('aria-label', 'Save diagram as image');
          saveBtn.setAttribute('title', 'Save diagram as PNG image');
        }
      }
    }
    // Update button when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updateSaveButton);
    } else {
      setTimeout(updateSaveButton, 0);
    }

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
      // v60 Phase 2-3: larger icons and zones to match server proportions
      const iW = 90 * s, iH = 68 * s, nodeH = 160 * s;
      // v60: increased padding for larger elements
      const pad = {t: 140 * s, b: 80 * s};
      const custColX = 60 * s, custColW = 220 * s;
      const opLeft = custColX + custColW + 120 * s;
      const opRight = w - 340 * s;
      const opW = opRight - opLeft;
      const extColX = opRight + 120 * s, extColW = 220 * s;
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
      if (DEBUG) console.log('renderSVG called, topology:', !!topology, 'connectionsRendered:', connectionsRendered);
      if (!topology) return;

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

      // Font sizes scaled - v60: increased to match server proportions (was 25-31% of server, now 68-70%)
      // v61: slightly reduced fonts (~20% smaller than v60)
      var fs = { title: 42 * s, subtitle: 24 * s, zone: 18 * s, label: 32 * s, param: 22 * s, conn: 18 * s, footer: 14 * s };

      var fontSans = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
      var fontMono = "ui-monospace,SFMono-Regular,Menlo,Monaco,monospace";
      // A11Y-001: SVG with role, aria-label, and title for screen readers
      var diagramTitle = topology.solutionTitle || 'Network Topology';
      var svg = '<svg width="100%" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="font-family:' + fontSans + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Network diagram: ' + diagramTitle + '">';
      svg += '<title>' + diagramTitle + '</title>';

      // Background with theme-aware colors
      // v60: larger grid for larger elements
      const gridSize = 28 * s;
      svg += \`<defs><pattern id="grid" width="\${gridSize}" height="\${gridSize}" patternUnits="userSpaceOnUse"><circle cx="\${gridSize/2}" cy="\${gridSize/2}" r="\${0.5*s}" fill="\${T.tf}" opacity="0.3"/></pattern></defs>\`;
      svg += \`<rect width="\${w}" height="\${h}" fill="\${T.bg}"/>\`;
      svg += \`<rect width="\${w}" height="\${h}" fill="url(#grid)" opacity="0.5"/>\`;

      // Title - v60: adjusted positioning for larger fonts (title 50*s, subtitle 28*s)
      svg += \`<text x="\${w/2}" y="\${50*s}" text-anchor="middle" fill="\${T.text}" font-size="\${fs.title}" font-weight="700" data-field="solutionTitle" style="cursor:pointer">\${topology.solutionTitle}</text>\`;
      svg += \`<text x="\${w/2}" y="\${85*s}" text-anchor="middle" fill="\${T.tm}" font-size="\${fs.subtitle}" font-family="' + fontMono + '">\${topology.customer} · \${topology.industry}</text>\`;

      // Zone labels - v60: adjusted for larger zone font (20*s)
      svg += \`<text x="\${custColX+custColW/2}" y="\${pad.t-25*s}" text-anchor="middle" fill="\${T.tf}" font-size="\${fs.zone}" font-family="' + fontMono + '" letter-spacing="2" font-weight="600">CUSTOMER PREMISES</text>\`;
      svg += \`<text x="\${opCX}" y="\${pad.t-25*s}" text-anchor="middle" fill="\${T.opLabel}" font-size="\${fs.zone}" font-family="' + fontMono + '" letter-spacing="2" font-weight="600">OPERATOR NETWORK</text>\`;
      svg += \`<text x="\${extColX+extColW/2}" y="\${pad.t-25*s}" text-anchor="middle" fill="\${T.tf}" font-size="\${fs.zone}" font-family="' + fontMono + '" letter-spacing="2" font-weight="600">EXTERNAL SERVICES</text>\`;

      // Operator cloud
      svg += \`<path d="\${cloudPath(opCX, opCY, opW+80*s, opCloudH)}" fill="\${T.opFill}" stroke="\${T.opStroke}" stroke-width="\${2.5*s}" stroke-dasharray="\${10*s},\${6*s}"/>\`;

      // v48: Connections - Render ONCE when stable, then just redraw on user interactions
      const nodeIdSet = new Set(Object.keys(layout.pos));
      const currentConnCount = (topology.connections || []).length;

      // Helper function to draw a single connection
      function drawConnection(conn, idx) {
        const f = getPos(conn.from, layout), t = getPos(conn.to, layout);
        if (!f || !t) return '';
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
        // v60: connection strokes match server proportions
        const dash = conn.style==='dashed'?\`\${8*s},\${6*s}\`:'none';
        const sw = conn.style==='double'? 4*s : 2.5*s;

        let connSvg = '';
        if (conn.style==='double') connSvg += \`<path d="\${pathD}" fill="none" stroke="\${cc}" stroke-width="\${10*s}" opacity="0.06"/>\`;
        connSvg += \`<path d="\${pathD}" fill="none" stroke="\${cc}" stroke-width="\${sw}" stroke-dasharray="\${dash}" opacity="0.5"/>\`;

        if (conn.label) {
          const mx = (sx+ex)/2, my = (sy+ey)/2;
          // v61: adjusted label box for conn font 18*s
          const lw = conn.label.length * 12 * s + 28 * s;
          connSvg += \`<rect x="\${mx-lw/2}" y="\${my-18*s}" width="\${lw}" height="\${36*s}" rx="\${18*s}" fill="\${T.clbg}" stroke="\${T.bdr}" stroke-width="\${0.5*s}" opacity="0.93"/>\`;
          connSvg += \`<text x="\${mx}" y="\${my+6*s}" text-anchor="middle" fill="\${T.cl}" font-size="\${fs.conn}" font-family="' + fontMono + '" font-weight="500" data-conn="\${idx}" style="cursor:pointer">\${conn.label}</text>\`;
        }
        return connSvg;
      }

      // v50: Render valid connections immediately - no waiting, no polling
      const validConnections = (topology.connections||[]).filter(conn =>
        conn?.from && conn?.to && nodeIdSet.has(conn.from) && nodeIdSet.has(conn.to)
      );
      if (DEBUG) console.log('conns: ' + validConnections.length + '/' + currentConnCount);
      validConnections.forEach((conn, idx) => { svg += drawConnection(conn, idx); });

      // Nodes
      allNodes.forEach(nd => {
        const p = getPos(nd.id, layout); if (!p) return;
        const col = TC[nd.type]||T.tm;
        const icon = ICONS[nd.type]||ICONS.cloud;
        const params = (nd.params||[]).slice(0,3);
        const isOp = (zones[nd.id]||'').startsWith('op_');
        // v61: adjusted label offset for 32*s label font
        const ly = p.cy + iH/2 + 24*s;

        svg += \`<g data-node="\${nd.id}" style="cursor:\${editMode?'grab':'default'}">\`;
        if (editMode) svg += \`<rect x="\${p.cx-iW/2-6*s}" y="\${p.cy-iH/2-6*s}" width="\${iW+12*s}" height="\${iH+12*s}" rx="\${5*s}" fill="transparent" stroke="\${T.selStroke}" stroke-width="\${1.5*s}" opacity="0.3"/>\`;
        svg += \`<svg x="\${p.cx-iW/2}" y="\${p.cy-iH/2}" width="\${iW}" height="\${iH}" viewBox="0 0 48 36" style="color:\${col};overflow:visible">\${icon}</svg>\`;
        svg += \`<text x="\${p.cx}" y="\${ly}" text-anchor="middle" fill="\${isOp?T.opLabel:T.text}" font-size="\${fs.label}" font-weight="600" data-label="\${nd.id}" style="cursor:pointer">\${nd.label}\${nd.count>1?' (×'+nd.count+')':''}</text>\`;
        // v60: increased line spacing for larger fonts (label 38*s, param 26*s)
        params.forEach((pr, i) => {
          svg += \`<text x="\${p.cx}" y="\${ly+26*s+i*24*s}" text-anchor="middle" fill="\${T.ts}" font-size="\${fs.param}" font-family="' + fontMono + '" opacity="0.7" data-param="\${nd.id}-\${i}" style="cursor:pointer">\${pr}</text>\`;
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

      if (DEBUG) console.log('renderSVG complete');
      } catch(e) { console.error('renderSVG error:', e); }
    }

    function attachEventHandlers() {
      if (!svgEl) return;
      // BUG-002: Use fixed viewBox dimensions, NOT scaled values
      // This matches the drag handlers which also use fixed 1600x900
      const w = 1600, h = 900;
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
      // PERF-001: Use throttled render during drag to avoid excessive DOM updates
      throttledRender();
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
      // PERF-001: Use throttled render during touch drag to avoid excessive DOM updates
      throttledRender();
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
      updateZoomDisplay();
      renderSVG();
    };

    window.zoomOut = function() {
      scale = Math.max(scale - 0.15, 0.7);
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

        // v60: Use sanitized filename from solution title
        var filename = sanitizeFilename(topology?.solutionTitle) + '.png';

        // v45: Convert SVG to PNG for reliable mobile saving
        // SVG data URIs don't work well with long-press save on mobile
        var exportCanvas = document.createElement('canvas');
        exportCanvas.width = 1600;
        exportCanvas.height = 900;
        var ctx = exportCanvas.getContext('2d');

        var tempImg = new Image();
        tempImg.onload = function() {
          ctx.fillStyle = isDarkMode ? '#171717' : '#ffffff';
          ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
          ctx.drawImage(tempImg, 0, 0);

          // v60: Try Web Share API directly on touch devices (don't pre-check canShare)
          if (showShareButton) {
            exportCanvas.toBlob(function(blob) {
              if (!blob) {
                var pngDataUri = exportCanvas.toDataURL('image/png');
                showSaveModal(pngDataUri, filename);
                return;
              }

              var file = new File([blob], filename, { type: 'image/png' });

              // Try share directly - ChatGPT sandbox may block canShare but allow share
              navigator.share({
                files: [file],
                title: (topology?.solutionTitle || 'Network Topology').substring(0, 100),
                text: 'Network topology diagram'
              }).then(function() {
                announceStatus('Diagram shared successfully');
              }).catch(function(err) {
                if (err.name === 'AbortError') {
                  announceStatus('Share cancelled');
                } else {
                  // Share failed (blocked by sandbox), fall back to modal
                  console.warn('Share failed:', err);
                  var pngDataUri = exportCanvas.toDataURL('image/png');
                  showSaveModal(pngDataUri, filename);
                }
              });
            }, 'image/png');
          } else {
            // Desktop or no share API, use modal
            var pngDataUri = exportCanvas.toDataURL('image/png');
            showSaveModal(pngDataUri, filename);
          }
        };
        tempImg.onerror = function() {
          // Fallback to SVG if PNG conversion fails
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

      // UX-007: Add keyframe animation for subtle pulse effect
      var styleEl = document.createElement('style');
      styleEl.textContent = '@keyframes saveHintPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.85;transform:scale(1.02)}}';
      modal.appendChild(styleEl);

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

      // UX-007: Enhanced visual hint with icon, larger text, and subtle animation
      var hintContainer = document.createElement('div');
      hintContainer.style.cssText = 'margin-top:12px;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 20px;background:rgba(59,130,246,0.2);border:1px solid rgba(59,130,246,0.4);border-radius:8px;animation:saveHintPulse 2s ease-in-out 3';
      hintContainer.setAttribute('role', 'status');
      hintContainer.setAttribute('aria-live', 'polite');

      // UX-007: Icon element - mouse pointer for desktop, finger for touch
      var iconSpan = document.createElement('span');
      iconSpan.style.cssText = 'font-size:24px;line-height:1';
      iconSpan.setAttribute('aria-hidden', 'true');
      iconSpan.textContent = isTouchDevice ? '👆' : '🖱️';

      // UX-007: Prominent instruction text
      var hintText = document.createElement('span');
      hintText.style.cssText = 'font-size:16px;font-weight:600;color:#fff;letter-spacing:0.3px';
      hintText.textContent = isTouchDevice ? 'Long-press image to save' : 'Right-click image to save';

      hintContainer.appendChild(iconSpan);
      hintContainer.appendChild(hintText);

      var closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.setAttribute('aria-label', 'Close save dialog');
      closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;width:44px;height:44px;background:rgba(255,255,255,0.15);border:none;border-radius:50%;font-size:20px;color:#fff;cursor:pointer';
      closeBtn.onmouseenter = function() { closeBtn.style.background = 'rgba(255,255,255,0.25)'; };
      closeBtn.onmouseleave = function() { closeBtn.style.background = 'rgba(255,255,255,0.15)'; };
      closeBtn.onclick = function() { modal.remove(); };

      modal.appendChild(img);
      modal.appendChild(filenameLabel);
      modal.appendChild(hintContainer);
      modal.appendChild(closeBtn);
      modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
      document.body.appendChild(modal);

      // MOB-003: Device-appropriate screen reader announcement
      announceStatus((isTouchDevice ? 'Long-press' : 'Right-click') + ' image to save as ' + filename);
    }

    // Data loading - try many possible locations
    // v51: Accept topology even without connections (streaming sends nodes first)
    function isValidTopology(data) {
      return data && data.customerNodes && data.operatorNodes && data.externalNodes;
    }

    function isCompleteTopology(data) {
      return isValidTopology(data) && Array.isArray(data.connections) && data.connections.length > 0;
    }

    // v53: Use COMPLETE server response (toolOutput), not streamed input
    // toolOutput = our server's structuredContent (has validated connections)
    // toolInput = ChatGPT's streamed arguments (may be incomplete)
    function tryGetData(obj) {
      if (!obj) return null;

      // PRIORITY 1: toolOutput - OUR complete validated response from server
      // This is structuredContent.topology - has ALL connections
      if (obj.toolOutput?.topology && isValidTopology(obj.toolOutput.topology)) {
        if (DEBUG) console.log('Using toolOutput.topology (complete)');
        return obj.toolOutput.topology;
      }

      // PRIORITY 2: toolOutput directly (if topology is at root)
      if (obj.toolOutput && isValidTopology(obj.toolOutput)) {
        if (DEBUG) console.log('Using toolOutput (complete)');
        return obj.toolOutput;
      }

      // PRIORITY 3: structuredContent.topology (alternative path)
      if (obj.structuredContent?.topology && isValidTopology(obj.structuredContent.topology)) {
        if (DEBUG) console.log('Using structuredContent.topology');
        return obj.structuredContent.topology;
      }

      // PRIORITY 4: toolInput - ONLY for progress display during streaming
      // WARNING: This is incomplete data, connections may be missing!
      if (obj.toolInput && isValidTopology(obj.toolInput)) {
        if (DEBUG) console.log('Using toolInput (streaming, may be incomplete)');
        return obj.toolInput;
      }

      return null;
    }

    var initialized = false;
    var DEBUG = false;  // Set to true for verbose logging
    var lastRenderTime = 0;
    var pendingRender = null;

    // v50: Throttled render to avoid excessive re-renders during streaming
    function throttledRender() {
      var now = Date.now();
      if (now - lastRenderTime < 100) {
        // Debounce rapid renders
        if (!pendingRender) {
          pendingRender = setTimeout(function() {
            pendingRender = null;
            lastRenderTime = Date.now();
            renderSVG();
          }, 100);
        }
        return;
      }
      lastRenderTime = now;
      renderSVG();
    }

    // v54: Show clear loading state with status messages
    // v55: Cisco-style SVG loading icons (replace emojis)
    var loadingStage = 'init';  // init, streaming, rendering

    // Cisco-style SVG loading icons
    var LOADING_ICONS = {
      // Two nodes with bidirectional arrows - representing client-server connection
      init: '<svg viewBox="0 0 48 36" width="48" height="36"><circle cx="10" cy="18" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="10" cy="18" r="2" fill="currentColor" opacity="0.35"/><circle cx="38" cy="18" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="38" cy="18" r="2" fill="currentColor" opacity="0.35"/><line x1="17" y1="18" x2="31" y2="18" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3,2"/><polyline points="28,15 31,18 28,21" fill="none" stroke="currentColor" stroke-width="1.5"/><polyline points="20,15 17,18 20,21" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
      // Central hub with 4 satellite nodes - representing topology being built
      streaming: '<svg viewBox="0 0 48 36" width="48" height="36"><circle cx="24" cy="18" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="18" r="1.5" fill="currentColor" opacity="0.35"/><circle cx="10" cy="10" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7"/><circle cx="38" cy="10" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7"/><circle cx="10" cy="26" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7"/><circle cx="38" cy="26" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7"/><line x1="19" y1="14" x2="13" y2="10" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><line x1="29" y1="14" x2="35" y2="10" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><line x1="19" y1="22" x2="13" y2="26" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><line x1="29" y1="22" x2="35" y2="26" stroke="currentColor" stroke-width="1.2" opacity="0.5"/></svg>',
      // Document with pen drawing lines
      rendering: '<svg viewBox="0 0 48 36" width="48" height="36"><rect x="8" y="4" width="24" height="28" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="12" y1="10" x2="24" y2="10" stroke="currentColor" stroke-width="1.2" opacity="0.35"/><line x1="12" y1="16" x2="28" y2="16" stroke="currentColor" stroke-width="1.2" opacity="0.35"/><line x1="12" y1="22" x2="20" y2="22" stroke="currentColor" stroke-width="1.2" opacity="0.35"/><line x1="36" y1="8" x2="26" y2="26" stroke="currentColor" stroke-width="2"/><polyline points="26,26 24,28 28,30" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="38" cy="6" r="3" fill="currentColor" opacity="0.25"/></svg>'
    };

    function showLoading(stage, data) {
      loadingStage = stage;
      const title = data?.solutionTitle || 'Network Topology';
      const custNodes = (data?.customerNodes || []).length;
      const opNodes = (data?.operatorNodes || []).length;
      const extNodes = (data?.externalNodes || []).length;
      const totalNodes = custNodes + opNodes + extNodes;

      const stages = {
        init: { text: 'Connecting to server...', sub: '' },
        streaming: {
          text: 'Generating topology...',
          sub: totalNodes > 0 ? 'Found ' + totalNodes + ' nodes' : 'Analyzing requirements'
        },
        rendering: { text: 'Drawing diagram...', sub: 'Almost ready' }
      };

      const s = stages[stage] || stages.init;
      const iconSvg = LOADING_ICONS[stage] || LOADING_ICONS.init;
      const dots = '<span class="dots"><span>.</span><span>.</span><span>.</span></span>';

      canvas.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:280px;padding:32px">' +
        '<style>' +
        '.dots span{animation:blink 1.4s infinite;opacity:0}.dots span:nth-child(2){animation-delay:0.2s}.dots span:nth-child(3){animation-delay:0.4s}@keyframes blink{0%,100%{opacity:0}50%{opacity:1}}' +
        '.loading-icon{width:48px;height:36px;margin-bottom:16px;color:' + T.tm + ';animation:pulse 2s ease-in-out infinite}@keyframes pulse{0%,100%{transform:scale(1);opacity:0.8}50%{transform:scale(1.1);opacity:1}}' +
        '</style>' +
        '<div class="loading-icon">' + iconSvg + '</div>' +
        '<div style="font-size:18px;font-weight:600;color:' + T.text + '">' + s.text + dots + '</div>' +
        (title !== 'Network Topology' ? '<div style="margin-top:8px;font-size:14px;color:' + T.ts + '">' + title + '</div>' : '') +
        (s.sub ? '<div style="margin-top:12px;font-size:12px;color:' + T.tm + '">' + s.sub + '</div>' : '') +
        '</div>';

      if (typeof window.openai?.notifyIntrinsicHeight === 'function') {
        try { window.openai.notifyIntrinsicHeight(300); } catch(e) {}
      }
    }

    function tryLoad() {
      if (initialized) return true;
      if (typeof window.openai !== 'object' || !window.openai) return false;
      const openai = window.openai;

      // Check if we have COMPLETE data (toolOutput)
      if (openai.toolOutput?.topology || openai.toolOutput) {
        hasToolOutput = true;
        const data = tryGetData(openai);
        if (data) {
          initialized = true;
          topology = data;
          if (DEBUG) console.log('Complete data loaded');
          renderSVG();
          saveState();
          return true;
        }
      }

      // Only have streaming data - show loading, don't render yet
      const streamData = openai.toolInput;
      if (streamData && isValidTopology(streamData)) {
        topology = streamData;
        showLoading('streaming', streamData);
        // Don't return true - keep polling for complete data
      }

      return false;
    }

    // v54: Show loading during streaming, render only when complete
    var hasToolOutput = false;

    window.addEventListener('message', (event) => {
      const msg = event.data;

      // On tool-result: we have COMPLETE data - render the diagram
      if (msg && msg.method === 'ui/notifications/tool-result') {
        if (DEBUG) console.log('tool-result received');
        hasToolOutput = true;
        showLoading('rendering', topology);

        // Small delay to show "Drawing diagram" before render
        setTimeout(() => {
          const freshData = tryGetData(window.openai || {});
          if (freshData) {
            topology = freshData;
            initialized = true;
            renderSVG();
            saveState();
          }
        }, 300);
        return;
      }

      // During streaming: update loading message with progress
      if (!hasToolOutput) {
        const data = tryGetData(msg);
        if (data) {
          topology = data;  // Track for progress display
          showLoading('streaming', data);
        }
      }
    });

    // Also listen for openai global changes
    window.addEventListener('openai:set_globals', () => {
      const openai = window.openai || {};

      // Check if toolOutput is now available (complete data)
      if (openai.toolOutput?.topology || openai.toolOutput) {
        hasToolOutput = true;
        const data = tryGetData(openai);
        if (data) {
          topology = data;
          initialized = true;
          renderSVG();
          saveState();
        }
        return;
      }

      // Still streaming - show progress
      const data = tryGetData(openai);
      if (data && !hasToolOutput) {
        topology = data;
        showLoading('streaming', data);
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

    // v54: Show loading state immediately, poll for complete data
    showLoading('init', null);

    if (!tryLoad()) {
      let attempts = 0;
      const poll = () => {
        attempts++;
        if (tryLoad()) return;
        // Fast checks (50ms x 10), medium (200ms x 20), slow (500ms x 40)
        if (attempts < 10) setTimeout(poll, 50);
        else if (attempts < 30) setTimeout(poll, 200);
        else if (attempts < 70) setTimeout(poll, 500);
        // After 70 attempts (~25 seconds), show debug only as last resort
        else showDebug();
      };
      setTimeout(poll, 50);
    }

    // v49: No fallback needed - connections render immediately when nodes exist
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
// v46: UX-007 - Save modal visual guidance: icon, prominent text, subtle pulse animation
// v53: Use toolOutput (complete server response) NOT toolInput (streamed, incomplete)
// v54: Show loading messages during streaming, render only when complete
// v55: Cisco-style SVG loading icons (replace emojis with professional icons)
// v56: Much larger font sizes
// v57: HUGE fonts - title 72px, nodes 56px, params 38px, zones 36px, connections 36px
// v58: (reverted) BUG-001 render dedup caused layout collapse
// v59: PERF-001 throttled drag, BUG-002 fix icon jumping (no render dedup)
// v60: Web Share API - native share sheet on mobile, fallback to modal
// v61: Professional SVG toolbar icons, refined button styling, focus states
const SVG_VIEWER_URI = "ui://widget/svg-viewer-v61.html";

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
