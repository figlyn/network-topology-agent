import { useState, useCallback, useRef, useEffect } from "react";

// ===== LLM PROVIDERS =====
const PROVIDERS = {
  anthropic: {
    name: "Anthropic", models: ["claude-sonnet-4-20250514","claude-haiku-4-5-20250929"],
    defaultModel: "claude-sonnet-4-20250514", placeholder: "optional - uses default key", keyLabel: "API Key (optional)",
    fields: ["apiKey"], docs: "https://console.anthropic.com/",
    call: async (prompt, system, cfg) => {
      const headers = {"Content-Type":"application/json"};
      if (cfg.apiKey) headers["x-api-key"] = cfg.apiKey;
      const r = await fetch("/api/anthropic", { method:"POST", headers,
        body: JSON.stringify({model:cfg.model,max_tokens:4096,system,messages:[{role:"user",content:prompt}]})
      }); const d=await r.json(); if(d.error)throw new Error(d.error.message); return d.content?.map(c=>c.text||"").join("")||"";
    }
  },
  openai: {
    name: "OpenAI", models: ["gpt-4o","gpt-4o-mini","o3-mini"],
    defaultModel: "gpt-4o", placeholder: "sk-...", keyLabel: "API Key",
    fields: ["apiKey"], docs: "https://platform.openai.com/api-keys",
    call: async (prompt, system, cfg) => {
      const r = await fetch("/api/openai", { method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${cfg.apiKey}`},
        body: JSON.stringify({model:cfg.model,messages:[{role:"system",content:system},{role:"user",content:prompt}],max_tokens:4096,temperature:0.3})
      }); const d=await r.json(); if(d.error)throw new Error(d.error.message); return d.choices?.[0]?.message?.content||"";
    }
  },
  azure_openai: {
    name: "Azure OpenAI", models: ["gpt-4o","gpt-4o-mini"],
    defaultModel: "gpt-4o", placeholder: "key", keyLabel: "API Key",
    fields: ["apiKey","endpoint","deployment"], docs: "https://portal.azure.com/",
    call: async (prompt, system, cfg) => {
      const url = `${cfg.endpoint.replace(/\/$/,"")}/openai/deployments/${cfg.deployment}/chat/completions?api-version=2024-08-01-preview`;
      const r = await fetch(url, { method:"POST", headers:{"Content-Type":"application/json","api-key":cfg.apiKey},
        body: JSON.stringify({messages:[{role:"system",content:system},{role:"user",content:prompt}],max_tokens:4096,temperature:0.3})
      }); const d=await r.json(); if(d.error)throw new Error(d.error.message); return d.choices?.[0]?.message?.content||"";
    }
  },
  gemini: {
    name: "Gemini", models: ["gemini-2.0-flash","gemini-1.5-pro"],
    defaultModel: "gemini-2.0-flash", placeholder: "AI...", keyLabel: "API Key",
    fields: ["apiKey"], docs: "https://aistudio.google.com/apikey",
    call: async (prompt, system, cfg) => {
      const url = `/api/gemini/${cfg.model}?key=${cfg.apiKey}`;
      const r = await fetch(url, { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({system_instruction:{parts:[{text:system}]},contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:4096,temperature:0.3}})
      }); const d=await r.json(); if(d.error)throw new Error(d.error.message); return d.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
    }
  },
  custom: {
    name: "Custom", models: [], defaultModel: "", placeholder: "optional", keyLabel: "Key (opt)",
    fields: ["apiKey","endpoint","customModel"], docs: "", hint: "OpenAI-compatible (Ollama, vLLM…)",
    call: async (prompt, system, cfg) => {
      const h = {"Content-Type":"application/json"}; if(cfg.apiKey) h["Authorization"]=`Bearer ${cfg.apiKey}`;
      const r = await fetch(`${cfg.endpoint.replace(/\/$/,"")}/v1/chat/completions`, { method:"POST", headers:h,
        body: JSON.stringify({model:cfg.customModel||"default",messages:[{role:"system",content:system},{role:"user",content:prompt}],max_tokens:4096,temperature:0.3})
      }); const d=await r.json(); if(d.error)throw new Error(d.error.message); return d.choices?.[0]?.message?.content||"";
    }
  }
};

const SYSTEM_PROMPT = `You are a telecom solution architect creating B2B network topology diagrams.

The diagram has THREE zones:
1. CUSTOMER ZONE (left) — premises, sites, endpoints
2. OPERATOR NETWORK CLOUD (center) — the telco network as a cloud with sub-positions:
   - "ingress" nodes: access-facing elements (access routers, CPE aggregation, RAN/cell towers)
   - "core" nodes: internal elements (SASE, SD-WAN controller, firewalls, core MPLS)
   - "egress" nodes: peering/interconnect elements (PE routers, cross-connects, colocation)
3. EXTERNAL SERVICES (right) — clouds, internet, SaaS, partners

Return ONLY valid JSON (no markdown, no backticks):
{
  "solutionTitle": "Short title",
  "customer": "Name",
  "industry": "Industry",
  "customerNodes": [
    { "id": "unique", "type": "icon_type", "label": "Name ≤20ch", "count": 1, "params": ["spec1","spec2"] }
  ],
  "operatorNodes": [
    { "id": "unique", "type": "icon_type", "label": "Name ≤20ch", "position": "ingress|core|egress", "params": ["spec1","spec2"] }
  ],
  "externalNodes": [
    { "id": "unique", "type": "icon_type", "label": "Name ≤20ch", "params": ["spec1","spec2"] }
  ],
  "connections": [
    { "from": "id", "to": "id", "label": "concise label", "style": "solid|dashed|double" }
  ]
}

ICON TYPES: hq_building, branch, small_site, factory, data_center, router, switch, firewall, cloud, saas, internet, mpls, wireless_ap, cell_tower, server, mec, iot_gateway, vpn, load_balancer, phone, security_cloud, sdwan, users

RULES:
- Group similar sites (85 branches = 1 node with count:85). Max 5 customer nodes.
- Operator nodes: max 5. MUST set "position" to "ingress", "core", or "egress".
- External nodes: max 5.
- Connection labels: very concise (e.g. "10G DIA", "ExpressRoute", "ZTNA")
- dashed=backup/failover, double=redundant, solid=primary`;

const EXAMPLES = {
  banking:{title:"Bank SD-WAN",description:`Enterprise SD-WAN for a national bank.\nCustomer: First National Bank\nIndustry: Financial Services\n\nSites:\n- Corporate HQ NYC (dual 10Gbps)\n- 85 branches (500Mbps + LTE backup)\n- 20 express branches (200Mbps + 4G)\n- 15 ATM locations (50Mbps + cellular)\n\nOperator:\n- Access routers at regional PoPs (ingress)\n- SD-WAN managed overlay (core)\n- MPLS backbone (core)\n- Managed NGFW + SASE (core)\n- PE routers cloud peering (egress)\n- 4G/LTE backup (ingress)\n\nExternal:\n- Azure ExpressRoute\n- AWS Direct Connect\n- FIS/Fiserv banking SaaS\n- Public internet\n\nSLA: 99.99% HQ, 99.95% branches`},
  manufacturing:{title:"5G Manufacturing",description:`Private 5G for automotive manufacturer.\nCustomer: AutoTech GmbH\nIndustry: Automotive\n\nSites:\n- Main Factory Detroit\n- Assembly Plant Chattanooga\n- Distribution Center Louisville\n- HQ Detroit\n\nOperator:\n- Private 5G RAN (ingress)\n- MEC edge (ingress)\n- SD-WAN overlay (core)\n- Managed firewall (core)\n- PE router cloud peering (egress)\n\nExternal:\n- Azure IoT Hub\n- SAP S/4HANA\n- Internet`},
  smb:{title:"AI Startup Cloud+GPU",description:`Multi-office + GPU cluster for AI startup.\nCustomer: NeuralScale AI\nIndustry: AI/Technology\n\nSites:\n- SF HQ Office (50 users, 2Gbps)\n- Austin Office (30 users, 1Gbps)\n- Remote Workers (40, ZTNA)\n\nOperator:\n- VPN concentrator (ingress)\n- SD-WAN controller (core)\n- SASE platform (core, ZTNA/SWG/CASB)\n- PE core router (egress, BGP)\n- Colocation cross-connect (egress, 100G)\n\nExternal:\n- AWS Direct Connect\n- Azure ExpressRoute\n- GCP Interconnect\n- GPU Cluster H100 (32x, 100G)\n- Teams Direct Routing`}
};

const DEMO = {
  banking:{solutionTitle:"First National Bank — Enterprise SD-WAN",customer:"First National Bank",industry:"Financial Services",customerNodes:[{id:"hq",type:"hq_building",label:"Corporate HQ",count:1,params:["NYC, dual fiber","10Gbps DIA"]},{id:"branches",type:"branch",label:"Full Branches",count:85,params:["500Mbps MPLS","WiFi 6, SD-WAN"]},{id:"express",type:"small_site",label:"Express Branches",count:20,params:["200Mbps","4G failover"]},{id:"atm",type:"iot_gateway",label:"ATM Sites",count:15,params:["50Mbps + cellular"]}],operatorNodes:[{id:"access",type:"router",label:"Access Routers",position:"ingress",params:["Regional PoPs","CPE aggregation"]},{id:"lte",type:"cell_tower",label:"LTE Backup",position:"ingress",params:["4G/LTE failover"]},{id:"sdwan",type:"sdwan",label:"SD-WAN Controller",position:"core",params:["Managed overlay","Path selection"]},{id:"fw",type:"firewall",label:"NGFW + SASE",position:"core",params:["DDoS protection","Zero Trust"]},{id:"pe",type:"router",label:"PE Peering Router",position:"egress",params:["Cloud interconnect","BGP peering"]}],externalNodes:[{id:"azure",type:"cloud",label:"Azure",params:["ExpressRoute","Primary"]},{id:"aws",type:"cloud",label:"AWS",params:["Direct Connect","DR"]},{id:"saas",type:"saas",label:"Banking SaaS",params:["FIS/Fiserv"]},{id:"inet",type:"internet",label:"Internet",params:["Scrubbed"]}],connections:[{from:"hq",to:"access",label:"10G DIA",style:"double"},{from:"branches",to:"access",label:"500M MPLS",style:"solid"},{from:"express",to:"access",label:"200Mbps",style:"solid"},{from:"atm",to:"lte",label:"LTE",style:"dashed"},{from:"branches",to:"lte",label:"LTE backup",style:"dashed"},{from:"access",to:"sdwan",label:"Overlay",style:"solid"},{from:"lte",to:"sdwan",label:"Failover",style:"dashed"},{from:"sdwan",to:"fw",label:"Inspect",style:"solid"},{from:"fw",to:"pe",label:"Clean",style:"solid"},{from:"pe",to:"azure",label:"ExpressRoute",style:"double"},{from:"pe",to:"aws",label:"Direct Connect",style:"dashed"},{from:"pe",to:"saas",label:"Private peer",style:"solid"},{from:"pe",to:"inet",label:"Breakout",style:"solid"}]},
  smb:{solutionTitle:"NeuralScale AI Hybrid WAN",customer:"NeuralScale AI",industry:"AI/Technology",customerNodes:[{id:"sf",type:"hq_building",label:"SF HQ Office",count:1,params:["50 users","2Gbps DIA"]},{id:"austin",type:"branch",label:"Austin Office",count:1,params:["30 users","1Gbps DIA"]},{id:"remote",type:"users",label:"Remote Workers",count:40,params:["ZTNA client","Split tunnel"]}],operatorNodes:[{id:"vpn",type:"vpn",label:"VPN Concentrator",position:"ingress",params:["Remote access","MFA enforced"]},{id:"sdwan",type:"sdwan",label:"SD-WAN Controller",position:"core",params:["Managed service"]},{id:"sase",type:"security_cloud",label:"SASE Platform",position:"core",params:["ZTNA/SWG/CASB","99.99% SLA"]},{id:"pe",type:"router",label:"PE Core Router",position:"egress",params:["MPLS backbone","BGP/OSPF"]},{id:"colo",type:"data_center",label:"Colo X-Connect",position:"egress",params:["100G fabric"]}],externalNodes:[{id:"aws",type:"cloud",label:"AWS Direct Connect",params:["Primary, 10Gbps"]},{id:"azure",type:"cloud",label:"Azure ExpressRoute",params:["ML training"]},{id:"gcp",type:"cloud",label:"GCP Interconnect",params:["BigQuery"]},{id:"gpu",type:"server",label:"GPU Cluster (H100)",params:["32x H100, 100G"]},{id:"teams",type:"phone",label:"Teams Routing",params:["Voice/Video, SBC"]}],connections:[{from:"sf",to:"sdwan",label:"2G DIA",style:"solid"},{from:"austin",to:"sdwan",label:"1G DIA",style:"solid"},{from:"remote",to:"vpn",label:"ZTNA tunnel",style:"dashed"},{from:"vpn",to:"sase",label:"ZTNA policy",style:"solid"},{from:"sdwan",to:"sase",label:"Inline inspect",style:"solid"},{from:"sase",to:"pe",label:"Clean traffic",style:"solid"},{from:"pe",to:"colo",label:"100G fiber",style:"double"},{from:"pe",to:"aws",label:"10G BGP",style:"solid"},{from:"pe",to:"azure",label:"10G BGP",style:"solid"},{from:"pe",to:"gcp",label:"10G BGP",style:"solid"},{from:"colo",to:"gpu",label:"100G / 99.99%",style:"double"},{from:"pe",to:"teams",label:"SBC / SIP",style:"solid"}]}
};

// ===== CISCO ICONS =====
const CI={
  hq_building:()=>(<g><rect x="14" y="2" width="20" height="32" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8"/><rect x="4" y="12" width="10" height="22" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8"/><rect x="34" y="12" width="10" height="22" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8"/>{[[17,5],[22,5],[28,5],[17,11],[22,11],[28,11],[17,17],[22,17],[28,17],[7,16],[7,22],[37,16],[37,22]].map(([x,y],i)=><rect key={i} x={x} y={y} width="3" height="3" fill="currentColor" opacity="0.35"/>)}<rect x="21" y="27" width="6" height="7" rx="1" fill="currentColor" opacity="0.25"/></g>),
  branch:()=>(<g><rect x="6" y="8" width="36" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><line x1="4" y1="8" x2="44" y2="8" stroke="currentColor" strokeWidth="2"/>{[10,18,26,34].map(x=><rect key={x} x={x} y="13" width="5" height="5" fill="currentColor" opacity="0.25"/>)}<rect x="20" y="22" width="8" height="8" rx="1" fill="currentColor" opacity="0.2"/></g>),
  small_site:()=>(<g><rect x="10" y="10" width="28" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><line x1="8" y1="10" x2="40" y2="10" stroke="currentColor" strokeWidth="2"/><rect x="17" y="14" width="14" height="8" rx="1" fill="currentColor" opacity="0.15"/></g>),
  factory:()=>(<g><rect x="4" y="14" width="36" height="18" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8"/><polyline points="4,14 4,6 16,14 16,6 28,14 28,6 40,14" fill="none" stroke="currentColor" strokeWidth="1.8"/><rect x="34" y="2" width="4" height="12" fill="none" stroke="currentColor" strokeWidth="1.5"/></g>),
  data_center:()=>(<g><rect x="8" y="2" width="32" height="32" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/>{[5,12,19,26].map(y=><g key={y}><rect x="12" y={y} width="24" height="5" rx="1" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="0.8"/><circle cx="15" cy={y+2.5} r="1.2" fill="currentColor" opacity="0.45"/></g>)}</g>),
  router:()=>(<g><circle cx="24" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="2"/><line x1="14" y1="18" x2="34" y2="18" stroke="currentColor" strokeWidth="1.8"/><line x1="24" y1="8" x2="24" y2="28" stroke="currentColor" strokeWidth="1.8"/><polyline points="31,15 34,18 31,21" fill="none" stroke="currentColor" strokeWidth="1.8"/><polyline points="17,15 14,18 17,21" fill="none" stroke="currentColor" strokeWidth="1.8"/><polyline points="21,11 24,8 27,11" fill="none" stroke="currentColor" strokeWidth="1.8"/><polyline points="21,25 24,28 27,25" fill="none" stroke="currentColor" strokeWidth="1.8"/></g>),
  switch:()=>(<g><rect x="6" y="10" width="36" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="15" x2="36" y2="15" stroke="currentColor" strokeWidth="1.5"/><polyline points="33,12.5 36,15 33,17.5" fill="none" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="21" x2="36" y2="21" stroke="currentColor" strokeWidth="1.5"/><polyline points="15,18.5 12,21 15,23.5" fill="none" stroke="currentColor" strokeWidth="1.5"/></g>),
  firewall:()=>(<g><rect x="6" y="4" width="36" height="28" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/>{[10,16,22,28].map(y=><line key={y} x1="6" y1={y} x2="42" y2={y} stroke="currentColor" strokeWidth="1" opacity="0.4"/>)}{[[18,4,10],[30,4,10],[12,10,16],[24,10,16],[36,10,16],[18,16,22],[30,16,22]].map(([x,a,b],i)=><line key={i} x1={x} y1={a} x2={x} y2={b} stroke="currentColor" strokeWidth="1" opacity="0.4"/>)}</g>),
  cloud:()=>(<g><path d="M14,28 A8,8 0 0,1 10,14 A10,10 0 0,1 28,8 A8,8 0 0,1 40,16 A7,7 0 0,1 38,28 Z" fill="none" stroke="currentColor" strokeWidth="2"/></g>),
  saas:()=>(<g><path d="M14,26 A7,7 0 0,1 10,14 A9,9 0 0,1 26,8 A7,7 0 0,1 38,14 A6,6 0 0,1 36,26 Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><rect x="17" y="14" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.25"/><rect x="24" y="14" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.25"/><rect x="20" y="20" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.25"/></g>),
  internet:()=>(<g><circle cx="24" cy="18" r="13" fill="none" stroke="currentColor" strokeWidth="1.8"/><ellipse cx="24" cy="18" rx="13" ry="5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/><ellipse cx="24" cy="18" rx="6" ry="13" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/></g>),
  mpls:()=>(<g><path d="M12,26 A7,7 0 0,1 8,16 A8,8 0 0,1 22,10 A7,7 0 0,1 38,14 A6,6 0 0,1 36,26 Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="4,2"/><text x="24" y="20" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="600" opacity="0.5">MPLS</text></g>),
  wireless_ap:()=>(<g><circle cx="24" cy="22" r="6" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="24" cy="22" r="2" fill="currentColor" opacity="0.35"/><path d="M16,14 A12,12 0 0,1 32,14" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/><path d="M12,10 A16,16 0 0,1 36,10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/></g>),
  cell_tower:()=>(<g><line x1="24" y1="4" x2="16" y2="34" stroke="currentColor" strokeWidth="1.8"/><line x1="24" y1="4" x2="32" y2="34" stroke="currentColor" strokeWidth="1.8"/><line x1="18" y1="14" x2="30" y2="14" stroke="currentColor" strokeWidth="1.2"/><line x1="17" y1="22" x2="31" y2="22" stroke="currentColor" strokeWidth="1.2"/><line x1="16" y1="30" x2="32" y2="30" stroke="currentColor" strokeWidth="1.2"/><circle cx="24" cy="4" r="2.5" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="1.2"/><path d="M30,6 A8,8 0 0,1 34,12" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/><path d="M18,6 A8,8 0 0,0 14,12" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/></g>),
  server:()=>(<g>{[4,14,24].map(y=><g key={y}><rect x="10" y={y} width="28" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="14" cy={y+4} r="1.2" fill="currentColor" opacity="0.45"/></g>)}</g>),
  mec:()=>(<g><rect x="10" y="8" width="22" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/>{[12,20].map(y=><g key={y}><rect x="14" y={y} width="14" height="5" rx="1" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="0.8"/><circle cx="17" cy={y+2.5} r="1" fill="currentColor" opacity="0.45"/></g>)}<path d="M34,14 A6,6 0 0,1 34,22" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/></g>),
  iot_gateway:()=>(<g><rect x="10" y="10" width="28" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/>{[20,28].map(x=><g key={x}><line x1={x} y1="10" x2={x} y2="4" stroke="currentColor" strokeWidth="1.5"/><circle cx={x} cy="3" r="1.5" fill="currentColor" opacity="0.35"/></g>)}{[13,18,23,28].map(x=><rect key={x} x={x} y="22" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.25"/>)}</g>),
  vpn:()=>(<g><rect x="12" y="16" width="24" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M18,16 V12 A6,6 0 0,1 30,12 V16" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="24" cy="23" r="2.5" fill="currentColor" opacity="0.25"/></g>),
  load_balancer:()=>(<g><circle cx="24" cy="18" r="13" fill="none" stroke="currentColor" strokeWidth="1.8"/><line x1="16" y1="14" x2="32" y2="14" stroke="currentColor" strokeWidth="1.5"/><polyline points="29,11.5 32,14 29,16.5" fill="none" stroke="currentColor" strokeWidth="1.2"/><line x1="16" y1="22" x2="32" y2="22" stroke="currentColor" strokeWidth="1.5"/><polyline points="19,19.5 16,22 19,24.5" fill="none" stroke="currentColor" strokeWidth="1.2"/></g>),
  phone:()=>(<g><rect x="8" y="14" width="32" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><rect x="11" y="16" width="14" height="8" rx="1" fill="currentColor" opacity="0.1"/><path d="M10,12 Q10,6 16,6 L32,6 Q38,6 38,12" fill="none" stroke="currentColor" strokeWidth="1.8"/></g>),
  security_cloud:()=>(<g><path d="M24,4 L38,10 L38,20 Q38,30 24,34 Q10,30 10,20 L10,10 Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><polyline points="17,19 22,24 31,14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></g>),
  sdwan:()=>(<g><circle cx="18" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/><circle cx="30" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/><circle cx="24" cy="24" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/><circle cx="24" cy="18" r="3" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1"/></g>),
  users:()=>(<g><circle cx="24" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M14,30 Q14,22 24,20 Q34,22 34,30" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="14" cy="10" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.45"/><circle cx="34" cy="10" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.45"/></g>)
};

const TCD={hq_building:"#60A5FA",branch:"#60A5FA",small_site:"#93C5FD",factory:"#FBBF24",data_center:"#A78BFA",router:"#818CF8",switch:"#818CF8",firewall:"#F87171",cloud:"#22D3EE",saas:"#2DD4BF",internet:"#94A3B8",mpls:"#C4B5FD",wireless_ap:"#FB923C",cell_tower:"#FB923C",server:"#34D399",mec:"#6EE7B7",iot_gateway:"#FCD34D",vpn:"#FB7185",load_balancer:"#A78BFA",phone:"#F472B6",security_cloud:"#F87171",sdwan:"#A78BFA",users:"#38BDF8"};
const TCL={hq_building:"#2563EB",branch:"#2563EB",small_site:"#3B82F6",factory:"#D97706",data_center:"#7C3AED",router:"#4F46E5",switch:"#4F46E5",firewall:"#DC2626",cloud:"#0891B2",saas:"#0D9488",internet:"#6B7280",mpls:"#7C3AED",wireless_ap:"#EA580C",cell_tower:"#EA580C",server:"#059669",mec:"#10B981",iot_gateway:"#CA8A04",vpn:"#E11D48",load_balancer:"#7C3AED",phone:"#DB2777",security_cloud:"#DC2626",sdwan:"#7C3AED",users:"#0284C7"};

const TH={
  dark:{bg:"#0B1120",text:"#F1F5F9",ts:"#94A3B8",tm:"#64748B",tf:"#475569",bdr:"#1E293B",bdrl:"#334155",srf:"#0F172A",dot:"#334155",cl:"#CBD5E1",clbg:"#1E293B",hbg:"rgba(11,17,32,0.9)",opFill:"rgba(99,102,241,0.04)",opStroke:"rgba(129,140,248,0.2)",opLabel:"#818CF8",sel:"rgba(59,130,246,0.15)",selStroke:"#3B82F6",editBg:"#1E293B",c:TCD},
  light:{bg:"#FFFFFF",text:"#0F172A",ts:"#475569",tm:"#94A3B8",tf:"#CBD5E1",bdr:"#E2E8F0",bdrl:"#CBD5E1",srf:"#F8FAFC",dot:"#CBD5E1",cl:"#334155",clbg:"#F1F5F9",hbg:"rgba(255,255,255,0.9)",opFill:"rgba(79,70,229,0.03)",opStroke:"rgba(99,102,241,0.18)",opLabel:"#6366F1",sel:"rgba(59,130,246,0.08)",selStroke:"#3B82F6",editBg:"#F1F5F9",c:TCL}
};

// ===== LAYOUT =====
function computeLayout(data, w, h) {
  const pad = {t:85, b:50};
  const iW = 50, iH = 38;
  const nodeH = 95;
  const custColX = 40, custColW = 140;
  const opLeft = custColX + custColW + 80;
  const opRight = w - 220;
  const opW = opRight - opLeft;
  const extColX = opRight + 80, extColW = 140;
  const opInX = opLeft + opW * 0.12;
  const opCoreX = opLeft + opW * 0.48;
  const opEgX = opLeft + opW * 0.84;
  const opCX = (opLeft + opRight) / 2;
  const opCY = (pad.t + h - pad.b) / 2;

  const pos = {};
  const zones = {};

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

  col(data.customerNodes, custColX + custColW/2, "customer");
  col(data.operatorNodes.filter(n=>n.position==="ingress"), opInX, "op_in");
  col(data.operatorNodes.filter(n=>n.position==="core"), opCoreX, "op_core");
  col(data.operatorNodes.filter(n=>n.position==="egress"), opEgX, "op_eg");
  col(data.externalNodes, extColX + extColW/2, "external");

  return { pos, zones, iW, iH, opLeft, opRight, opCX, opCY, opW, pad, custColX, custColW, extColX, extColW };
}

function cloudPath(cx, cy, w, h) {
  const hw=w/2, hh=h/2;
  return `M ${cx-hw*0.65},${cy+hh*0.95} C ${cx-hw*1.08},${cy+hh*0.55} ${cx-hw*1.05},${cy-hh*0.35} ${cx-hw*0.55},${cy-hh*0.65} C ${cx-hw*0.25},${cy-hh*1.08} ${cx+hw*0.15},${cy-hh*1.1} ${cx+hw*0.4},${cy-hh*0.7} C ${cx+hw*0.65},${cy-hh*1.05} ${cx+hw*1.05},${cy-hh*0.55} ${cx+hw*1.0},${cy-hh*0.05} C ${cx+hw*1.08},${cy+hh*0.45} ${cx+hw*0.95},${cy+hh*0.9} ${cx+hw*0.55},${cy+hh*0.95} Z`;
}

// ===== INLINE TEXT EDITOR =====
function InlineEdit({ x, y, value, onChange, fontSize, fontFamily, fill, fontWeight, textAnchor, theme, maxWidth }) {
  const T = TH[theme];
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => { setVal(value); }, [value]);
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);

  if (!editing) {
    return (
      <text x={x} y={y} textAnchor={textAnchor||"middle"} fill={fill} fontSize={fontSize}
        fontWeight={fontWeight||"normal"} fontFamily={fontFamily} style={{cursor:"text"}}
        onDoubleClick={(e)=>{e.stopPropagation(); setEditing(true);}}>
        {value}
      </text>
    );
  }

  const w = Math.max(60, Math.min(maxWidth||180, value.length * (fontSize * 0.65) + 20));
  const h = fontSize + 10;
  const fx = textAnchor === "middle" ? x - w/2 : x;

  return (
    <foreignObject x={fx} y={y - h + 4} width={w} height={h+4}>
      <input ref={inputRef} value={val} onChange={e=>setVal(e.target.value)}
        onBlur={()=>{setEditing(false); onChange(val);}}
        onKeyDown={e=>{if(e.key==="Enter"){setEditing(false); onChange(val);} if(e.key==="Escape"){setEditing(false); setVal(value);}}}
        style={{
          width:"100%", height:"100%", padding:"2px 4px",
          background:T.editBg, color:fill, border:`1px solid ${T.selStroke}`,
          borderRadius:"3px", fontSize:`${fontSize}px`, fontFamily,
          fontWeight:fontWeight||"normal", textAlign:textAnchor==="middle"?"center":"left",
          outline:"none", boxSizing:"border-box"
        }}
      />
    </foreignObject>
  );
}

// ===== TOPOLOGY =====
function Topo({ data, setData, cRef, theme, editMode, isMobile }) {
  const T = TH[theme];
  const [dims, setDims] = useState({w:1300, h:800});
  const [dragState, setDragState] = useState(null); // {nodeId, offsetX, offsetY}
  const [overrides, setOverrides] = useState({}); // {nodeId: {dx, dy}}
  const [selected, setSelected] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    if (cRef?.current) {
      const r = cRef.current.getBoundingClientRect();
      const mx = Math.max(
        data.customerNodes.length,
        data.operatorNodes.filter(n=>n.position==="ingress").length,
        data.operatorNodes.filter(n=>n.position==="core").length,
        data.operatorNodes.filter(n=>n.position==="egress").length,
        data.externalNodes.length
      );
      if (isMobile) {
        setDims({w:Math.max(r.width-20,900), h:Math.max(500, mx*80+150)});
      } else {
        setDims({w:Math.max(r.width-40,1100), h:Math.max(700, mx*100+200)});
      }
    }
  }, [data, cRef, isMobile]);

  // Reset overrides when data changes fundamentally
  useEffect(() => { setOverrides({}); setSelected(null); }, [data.solutionTitle]);

  const {w, h} = dims;
  const layout = computeLayout(data, w, h);
  const {pos, zones, iW, iH, opLeft, opRight, opCX, opCY, opW, pad} = layout;

  // Apply drag overrides to positions
  const getPos = (id) => {
    const base = pos[id];
    if (!base) return null;
    const ov = overrides[id];
    if (!ov) return { ...base };
    return {
      x: base.x + ov.dx,
      y: base.y + ov.dy,
      cx: base.cx + ov.dx,
      cy: base.cy + ov.dy,
    };
  };

  // Drag handlers
  const onMouseDown = (e, nodeId) => {
    if (!editMode) return;
    e.stopPropagation();
    const svgPt = svgRef.current.createSVGPoint();
    svgPt.x = e.clientX; svgPt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM().inverse();
    const pt = svgPt.matrixTransform(ctm);
    const p = getPos(nodeId);
    setDragState({ nodeId, offsetX: pt.x - p.cx, offsetY: pt.y - p.cy });
    setSelected(nodeId);
  };

  const onMouseMove = useCallback((e) => {
    if (!dragState) return;
    const svgPt = svgRef.current.createSVGPoint();
    svgPt.x = e.clientX; svgPt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM().inverse();
    const pt = svgPt.matrixTransform(ctm);
    const base = pos[dragState.nodeId];
    if (!base) return;
    setOverrides(prev => ({
      ...prev,
      [dragState.nodeId]: {
        dx: pt.x - dragState.offsetX - base.cx,
        dy: pt.y - dragState.offsetY - base.cy
      }
    }));
  }, [dragState, pos]);

  const onMouseUp = useCallback(() => { setDragState(null); }, []);

  // Touch handlers for mobile
  const onTouchStart = (e, nodeId) => {
    if (!editMode) return;
    e.stopPropagation();
    const touch = e.touches[0];
    const svgPt = svgRef.current.createSVGPoint();
    svgPt.x = touch.clientX; svgPt.y = touch.clientY;
    const ctm = svgRef.current.getScreenCTM().inverse();
    const pt = svgPt.matrixTransform(ctm);
    const p = getPos(nodeId);
    setDragState({ nodeId, offsetX: pt.x - p.cx, offsetY: pt.y - p.cy });
    setSelected(nodeId);
  };

  const onTouchMove = useCallback((e) => {
    if (!dragState) return;
    e.preventDefault();
    const touch = e.touches[0];
    const svgPt = svgRef.current.createSVGPoint();
    svgPt.x = touch.clientX; svgPt.y = touch.clientY;
    const ctm = svgRef.current.getScreenCTM().inverse();
    const pt = svgPt.matrixTransform(ctm);
    const base = pos[dragState.nodeId];
    if (!base) return;
    setOverrides(prev => ({
      ...prev,
      [dragState.nodeId]: {
        dx: pt.x - dragState.offsetX - base.cx,
        dy: pt.y - dragState.offsetY - base.cy
      }
    }));
  }, [dragState, pos]);

  const onTouchEnd = useCallback(() => { setDragState(null); }, []);

  useEffect(() => {
    if (dragState) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onTouchEnd);
      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
      };
    }
  }, [dragState, onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

  const allNodes = [...data.customerNodes, ...data.operatorNodes, ...data.externalNodes];

  // Update helpers
  const updateNode = (id, field, value) => {
    setData(prev => {
      const update = (arr) => arr.map(n => n.id === id ? {...n, [field]: value} : n);
      return {...prev, customerNodes: update(prev.customerNodes), operatorNodes: update(prev.operatorNodes), externalNodes: update(prev.externalNodes)};
    });
  };
  const updateParam = (id, idx, value) => {
    setData(prev => {
      const update = (arr) => arr.map(n => {
        if (n.id !== id) return n;
        const params = [...(n.params||[])];
        params[idx] = value;
        return {...n, params};
      });
      return {...prev, customerNodes: update(prev.customerNodes), operatorNodes: update(prev.operatorNodes), externalNodes: update(prev.externalNodes)};
    });
  };
  const updateConnLabel = (idx, value) => {
    setData(prev => {
      const conns = [...prev.connections];
      conns[idx] = {...conns[idx], label: value};
      return {...prev, connections: conns};
    });
  };

  // Connection routing
  const routeConn = (conn) => {
    const f = getPos(conn.from), t = getPos(conn.to);
    if (!f || !t) return null;
    let sx, sy, ex, ey;
    if (Math.abs(f.cx - t.cx) < 60) {
      if (f.cy < t.cy) { sx=f.cx; sy=f.cy+iH/2+3; ex=t.cx; ey=t.cy-iH/2-3; }
      else { sx=f.cx; sy=f.cy-iH/2-3; ex=t.cx; ey=t.cy+iH/2+3; }
    } else if (f.cx < t.cx) {
      sx=f.cx+iW/2+3; sy=f.cy; ex=t.cx-iW/2-3; ey=t.cy;
    } else {
      sx=f.cx-iW/2-3; sy=f.cy; ex=t.cx+iW/2+3; ey=t.cy;
    }
    const dx=ex-sx, dy=ey-sy;
    const cp = Math.max(Math.abs(dx)*0.3, 25);
    const pathD = Math.abs(dy) > Math.abs(dx)*2
      ? `M${sx},${sy} C${sx},${sy+Math.sign(dy)*cp} ${ex},${ey-Math.sign(dy)*cp} ${ex},${ey}`
      : `M${sx},${sy} C${sx+Math.sign(dx)*cp},${sy} ${ex-Math.sign(dx)*cp},${ey} ${ex},${ey}`;
    const fz = zones[conn.from]||"", tz = zones[conn.to]||"";
    const crossIn = fz==="customer"&&tz.startsWith("op_");
    const crossOut = fz.startsWith("op_")&&tz==="external";
    return {sx,sy,ex,ey,pathD,crossIn,crossOut, mx:(sx+ex)/2, my:(sy+ey)/2};
  };

  const opCloudH = h - pad.t - pad.b + 20;

  return (
    <svg ref={svgRef} width={isMobile?"100%":w} height={isMobile?"auto":h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg"
      onClick={()=>setSelected(null)} style={{cursor: dragState ? "grabbing" : "default", maxWidth:"100%", minHeight:isMobile?"400px":"auto"}}>
      <defs>
        <pattern id="tgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="0.4" fill={T.dot} opacity="0.3"/>
        </pattern>
        <marker id={`ah-${theme}`} markerWidth="6" markerHeight="5" refX="5.5" refY="2.5" orient="auto">
          <polygon points="0 0.5,5.5 2.5,0 4.5" fill={T.tm} opacity="0.5"/>
        </marker>
      </defs>
      <rect width={w} height={h} fill="url(#tgrid)"/>

      {/* Title — editable */}
      {editMode ? (
        <InlineEdit x={w/2} y={27} value={data.solutionTitle} fontSize={17} fontWeight="700"
          fontFamily="'DM Sans',sans-serif" fill={T.text} textAnchor="middle" theme={theme} maxWidth={400}
          onChange={v=>setData(d=>({...d,solutionTitle:v}))}/>
      ) : (
        <text x={w/2} y="26" textAnchor="middle" fill={T.text} fontSize="17" fontWeight="700" fontFamily="'DM Sans',sans-serif">{data.solutionTitle}</text>
      )}
      {editMode ? (
        <InlineEdit x={w/2} y={45} value={`${data.customer} · ${data.industry}`} fontSize={10}
          fontFamily="'JetBrains Mono',monospace" fill={T.tm} textAnchor="middle" theme={theme} maxWidth={300}
          onChange={v=>{const parts=v.split("·").map(s=>s.trim()); setData(d=>({...d, customer:parts[0]||d.customer, industry:parts[1]||d.industry}));}}/>
      ) : (
        <text x={w/2} y="44" textAnchor="middle" fill={T.tm} fontSize="10" fontFamily="'JetBrains Mono',monospace">{data.customer} · {data.industry}</text>
      )}

      {/* Zone labels */}
      <text x={layout.custColX+layout.custColW/2} y={pad.t-14} textAnchor="middle" fill={T.tf} fontSize="8" fontFamily="'JetBrains Mono',monospace" letterSpacing="2" fontWeight="600">CUSTOMER PREMISES</text>
      <text x={opCX} y={pad.t-14} textAnchor="middle" fill={T.opLabel} fontSize="8" fontFamily="'JetBrains Mono',monospace" letterSpacing="2" fontWeight="600">OPERATOR NETWORK</text>
      <text x={layout.extColX+layout.extColW/2} y={pad.t-14} textAnchor="middle" fill={T.tf} fontSize="8" fontFamily="'JetBrains Mono',monospace" letterSpacing="2" fontWeight="600">EXTERNAL SERVICES</text>

      {/* Operator cloud */}
      <path d={cloudPath(opCX, opCY, opW+60, opCloudH)} fill={T.opFill} stroke={T.opStroke} strokeWidth="2" strokeDasharray="8,5"/>

      {/* Connections */}
      {data.connections.map((conn, idx) => {
        const r = routeConn(conn);
        if (!r) return null;
        const fn = allNodes.find(n=>n.id===conn.from);
        const cc = T.c[fn?.type]||T.tm;
        const dash = conn.style==="dashed"?"5,4":"none";
        const sw = conn.style==="double"?2.5:1.4;

        return (
          <g key={`c-${idx}`}>
            {conn.style==="double"&&<path d={r.pathD} fill="none" stroke={cc} strokeWidth="6" opacity="0.06"/>}
            <path d={r.pathD} fill="none" stroke={cc} strokeWidth={sw} strokeDasharray={dash} opacity="0.5" markerEnd={`url(#ah-${theme})`}/>
            {r.crossIn&&<circle cx={opLeft} cy={(r.sy+r.ey)/2} r="3" fill={cc} opacity="0.4" stroke={T.opStroke} strokeWidth="1"/>}
            {r.crossOut&&<circle cx={opRight} cy={(r.sy+r.ey)/2} r="3" fill={cc} opacity="0.4" stroke={T.opStroke} strokeWidth="1"/>}
            {conn.label && (
              editMode ? (
                <g>
                  <rect x={r.mx-50} y={r.my-9} width="100" height="17" rx="8" fill={T.clbg} stroke={T.bdr} strokeWidth="0.5" opacity="0.93"/>
                  <InlineEdit x={r.mx} y={r.my+3.5} value={conn.label} fontSize={7.5}
                    fontFamily="'JetBrains Mono',monospace" fontWeight="500" fill={T.cl} textAnchor="middle"
                    theme={theme} maxWidth={100} onChange={v=>updateConnLabel(idx, v)}/>
                </g>
              ) : (
                <g>
                  <rect x={r.mx-conn.label.length*2.8-6} y={r.my-8} width={conn.label.length*5.6+12} height="15" rx="7.5" fill={T.clbg} stroke={T.bdr} strokeWidth="0.5" opacity="0.93"/>
                  <text x={r.mx} y={r.my+3} textAnchor="middle" fill={T.cl} fontSize="7.5" fontFamily="'JetBrains Mono',monospace" fontWeight="500">{conn.label}</text>
                </g>
              )
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {allNodes.map(nd => {
        const p = getPos(nd.id); if (!p) return null;
        const col = T.c[nd.type]||T.tm;
        const Icon = CI[nd.type]; if (!Icon) return null;
        const params = (nd.params||[]).slice(0,3);
        const isOp = (zones[nd.id]||"").startsWith("op_");
        const ly = p.cy + iH/2 + 11;
        const isSel = selected === nd.id;

        return (
          <g key={nd.id} onClick={e=>{e.stopPropagation(); if(editMode) setSelected(nd.id);}}
            onMouseDown={e=>onMouseDown(e, nd.id)}
            onTouchStart={e=>onTouchStart(e, nd.id)}
            style={{cursor: editMode ? (dragState?.nodeId===nd.id ? "grabbing" : "grab") : "default", touchAction: editMode ? "none" : "auto"}}>

            {/* Selection highlight */}
            {editMode && isSel && (
              <rect x={p.cx-iW/2-8} y={p.cy-iH/2-8} width={iW+16} height={iH + 16 + params.length*11 + 28}
                rx="6" fill={T.sel} stroke={T.selStroke} strokeWidth="1.5" strokeDasharray="4,2"/>
            )}

            {/* Drag handle indicator */}
            {editMode && (
              <rect x={p.cx-iW/2-4} y={p.cy-iH/2-4} width={iW+8} height={iH+8}
                rx="4" fill="transparent" stroke={isSel?T.selStroke:"transparent"} strokeWidth="1" opacity="0.5"/>
            )}

            {/* Icon */}
            <svg x={p.cx-iW/2} y={p.cy-iH/2} width={iW} height={iH} viewBox="0 0 48 36" style={{color:col,overflow:"visible"}}>{Icon()}</svg>

            {/* Label */}
            {editMode ? (
              <InlineEdit x={p.cx} y={ly} value={`${nd.label}${nd.count>1?` (×${nd.count})`:""}`}
                fontSize={10} fontWeight="600" fontFamily="'DM Sans',sans-serif"
                fill={isOp?T.opLabel:T.text} textAnchor="middle" theme={theme} maxWidth={160}
                onChange={v=>{
                  const m = v.match(/^(.+?)(?:\s*\(×(\d+)\))?$/);
                  if (m) { updateNode(nd.id, "label", m[1].trim()); if(m[2]) updateNode(nd.id, "count", parseInt(m[2])); }
                  else updateNode(nd.id, "label", v);
                }}/>
            ) : (
              <text x={p.cx} y={ly} textAnchor="middle" fill={isOp?T.opLabel:T.text} fontSize="10" fontWeight="600" fontFamily="'DM Sans',sans-serif">
                {nd.label}{nd.count>1?` (×${nd.count})`:""}
              </text>
            )}

            {/* Params */}
            {params.map((pr, i) => (
              editMode ? (
                <InlineEdit key={i} x={p.cx} y={ly+12+i*11} value={pr}
                  fontSize={8} fontFamily="'JetBrains Mono',monospace" fill={T.ts} textAnchor="middle"
                  theme={theme} maxWidth={140} onChange={v=>updateParam(nd.id, i, v)}/>
              ) : (
                <text key={i} x={p.cx} y={ly+12+i*11} textAnchor="middle" fill={T.ts} fontSize="8" fontFamily="'JetBrains Mono',monospace" opacity="0.7">{pr}</text>
              )
            ))}
          </g>
        );
      })}

      {/* Ingress / Egress */}
      <text x={opLeft} y={h-pad.b+18} textAnchor="middle" fill={T.opLabel} fontSize="7" fontFamily="'JetBrains Mono',monospace" letterSpacing="1.5" opacity="0.5">▸ INGRESS</text>
      <text x={opRight} y={h-pad.b+18} textAnchor="middle" fill={T.opLabel} fontSize="7" fontFamily="'JetBrains Mono',monospace" letterSpacing="1.5" opacity="0.5">EGRESS ▸</text>

      {/* Edit mode hint */}
      {editMode && (
        <text x={w-10} y={h-8} textAnchor="end" fill={T.tm} fontSize="8" fontFamily="'JetBrains Mono',monospace" opacity="0.5">
          Drag to move · Double-click to edit text · Click to select
        </text>
      )}
    </svg>
  );
}

// ===== APP =====
export default function App() {
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [data,setData]=useState(null);
  const [error,setError]=useState(null);
  const [activeEx,setActiveEx]=useState(null);
  const [theme,setTheme]=useState("light");
  const [provider,setProvider]=useState("anthropic");
  const [config,setConfig]=useState({apiKey:"",model:"",endpoint:"",deployment:"",customModel:""});
  const [showCfg,setShowCfg]=useState(false);
  const [showIcons,setShowIcons]=useState(false);
  const [editMode,setEditMode]=useState(false);
  const [isMobile,setIsMobile]=useState(typeof window!=='undefined'&&window.innerWidth<768);
  const [drawerOpen,setDrawerOpen]=useState(false);
  const dRef=useRef(null);
  const T=TH[theme]; const P=PROVIDERS[provider];

  useEffect(()=>{setConfig(c=>({...c,model:P.defaultModel}));},[provider]);

  useEffect(()=>{
    const handleResize=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener('resize',handleResize);
    return ()=>window.removeEventListener('resize',handleResize);
  },[]);

  const generate=useCallback(async(desc)=>{
    setLoading(true);setError(null);setData(null);setEditMode(false);
    try{
      const text=await P.call(`Analyze this B2B telecom solution:\n\n${desc}`,SYSTEM_PROMPT,config);
      const parsed=JSON.parse(text.replace(/```json|```/g,"").trim());
      if(!parsed.customerNodes||!parsed.operatorNodes||!parsed.externalNodes)throw new Error("Invalid");
      setData(parsed);
    }catch(e){console.error(e);setError(e.message);}
    finally{setLoading(false);}
  },[P,config]);

  const handleExport=()=>{
    // Temporarily disable edit mode for clean export
    const svg=dRef.current?.querySelector("svg"); if(!svg)return;
    const c=svg.cloneNode(true); c.setAttribute("xmlns","http://www.w3.org/2000/svg"); c.style.background=T.bg;
    // Remove foreignObject elements (edit inputs) from export
    c.querySelectorAll("foreignObject").forEach(fo=>fo.remove());
    const b=new Blob([new XMLSerializer().serializeToString(c)],{type:"image/svg+xml"});
    const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download=`topology-${Date.now()}.svg`; a.click(); URL.revokeObjectURL(u);
  };

  const hasKey=provider==="custom"?!!config.endpoint:provider==="anthropic"||!!config.apiKey;

  const inp=(label,key,ph,type="text")=>(
    <div style={{marginBottom:"4px"}}>
      <label style={{fontSize:"8px",color:T.tm,fontFamily:"'JetBrains Mono',monospace",display:"block",marginBottom:"2px"}}>{label}</label>
      <input value={config[key]} onChange={e=>setConfig(c=>({...c,[key]:e.target.value}))} placeholder={ph} type={type}
        style={{width:"100%",padding:"5px 7px",borderRadius:"4px",border:`1px solid ${T.bdr}`,background:T.bg,color:T.text,fontSize:"10px",fontFamily:"'JetBrains Mono',monospace",outline:"none"}}/>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'DM Sans',sans-serif",transition:"background 0.3s"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      <header style={{padding:isMobile?"8px 12px":"10px 20px",borderBottom:`1px solid ${T.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:T.hbg,backdropFilter:"blur(12px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          {isMobile&&(
            <button onClick={()=>setDrawerOpen(v=>!v)} style={{
              padding:"8px",background:"transparent",border:"none",color:T.text,
              fontSize:"18px",cursor:"pointer",minWidth:"44px",minHeight:"44px",
              display:"flex",alignItems:"center",justifyContent:"center"
            }}>{drawerOpen?"✕":"☰"}</button>
          )}
          <div style={{width:"26px",height:"26px",borderRadius:"5px",background:"linear-gradient(135deg,#3B82F6,#6366F1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:700,color:"white"}}>◈</div>
          <div>
            <h1 style={{margin:0,fontSize:isMobile?"12px":"13px",fontWeight:700}}>{isMobile?"Topology Agent":"Network Topology Agent"}</h1>
            {!isMobile&&<p style={{margin:0,fontSize:"8px",color:T.tm,fontFamily:"'JetBrains Mono',monospace"}}>Drag · Edit · Export · Multi-LLM</p>}
          </div>
        </div>
        <div style={{display:"flex",gap:isMobile?"4px":"5px",alignItems:"center"}}>
          {data && (
            <button onClick={()=>setEditMode(v=>!v)} style={{
              padding:isMobile?"10px 14px":"5px 12px",background:editMode?"rgba(59,130,246,0.15)":"transparent",
              border:`1px solid ${editMode?T.selStroke:T.bdr}`,borderRadius:"5px",
              color:editMode?T.selStroke:T.ts,fontSize:isMobile?"18px":"10px",cursor:"pointer",
              fontFamily:"'JetBrains Mono',monospace",fontWeight:editMode?600:400,
              transition:"all 0.2s",minHeight:isMobile?"48px":"auto"
            }}>{editMode?"✓":"✎"}{!isMobile&&(editMode?" Editing":" Edit")}</button>
          )}
          <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{padding:isMobile?"10px 14px":"5px 10px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:"5px",color:T.ts,fontSize:isMobile?"18px":"10px",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",minHeight:isMobile?"48px":"auto"}}>{theme==="dark"?"☀":"●"}</button>
          {data&&<button onClick={handleExport} style={{padding:isMobile?"10px 14px":"5px 10px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:"5px",color:T.ts,fontSize:isMobile?"18px":"10px",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",minHeight:isMobile?"48px":"auto"}}>↓{!isMobile&&" SVG"}</button>}
        </div>
      </header>

      <div style={{display:"flex",minHeight:"calc(100vh - 47px)"}}>
        {/* Mobile overlay */}
        {isMobile&&drawerOpen&&(
          <div onClick={()=>setDrawerOpen(false)} style={{
            position:"fixed",inset:0,top:"47px",background:"rgba(0,0,0,0.5)",zIndex:40
          }}/>
        )}
        <aside style={{
          width:isMobile?"85vw":"310px",
          maxWidth:isMobile?"320px":"none",
          position:isMobile?"fixed":"relative",
          left:isMobile?(drawerOpen?0:"-100%"):0,
          top:isMobile?"47px":0,
          height:isMobile?"calc(100vh - 47px)":"auto",
          zIndex:isMobile?50:1,
          transition:"left 0.3s ease",
          borderRight:`1px solid ${T.bdr}`,padding:"10px",display:"flex",flexDirection:"column",gap:"7px",overflowY:"auto",flexShrink:0,background:T.srf
        }}>

          <div style={{borderRadius:"5px",border:`1px solid ${T.bdr}`,overflow:"hidden"}}>
            <button onClick={()=>setShowCfg(v=>!v)} style={{width:"100%",padding:"6px 10px",background:"transparent",border:"none",color:T.ts,fontSize:"9px",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",textAlign:"left",display:"flex",justifyContent:"space-between"}}>
              <span>LLM: {P.name}</span><span>{showCfg?"▾":"▸"}</span>
            </button>
            {showCfg&&(
              <div style={{padding:"7px 10px",borderTop:`1px solid ${T.bdr}`,background:T.bg}}>
                <div style={{display:"flex",gap:"3px",flexWrap:"wrap",marginBottom:"6px"}}>
                  {Object.entries(PROVIDERS).map(([k,v])=>(<button key={k} onClick={()=>setProvider(k)} style={{padding:isMobile?"6px 10px":"3px 7px",borderRadius:"4px",border:`1px solid ${provider===k?"#3B82F6":T.bdr}`,background:provider===k?"rgba(59,130,246,0.1)":"transparent",color:provider===k?"#3B82F6":T.ts,fontSize:isMobile?"10px":"8px",cursor:"pointer",minHeight:isMobile?"36px":"auto"}}>{v.name}</button>))}
                </div>
                {P.hint&&<p style={{margin:"0 0 5px",fontSize:"8px",color:T.tm}}>{P.hint}</p>}
                {P.fields.includes("apiKey")&&inp(P.keyLabel,"apiKey",P.placeholder,"password")}
                {P.fields.includes("endpoint")&&inp("Endpoint","endpoint","https://...")}
                {P.fields.includes("deployment")&&inp("Deployment","deployment","gpt-4o")}
                {P.fields.includes("customModel")&&inp("Model","customModel","llama3.1:70b")}
                {P.models.length>0&&(
                  <div style={{marginBottom:"4px"}}>
                    <label style={{fontSize:"8px",color:T.tm,fontFamily:"'JetBrains Mono',monospace",display:"block",marginBottom:"2px"}}>MODEL</label>
                    <select value={config.model} onChange={e=>setConfig(c=>({...c,model:e.target.value}))} style={{width:"100%",padding:"4px",borderRadius:"4px",border:`1px solid ${T.bdr}`,background:T.bg,color:T.text,fontSize:"9px",fontFamily:"'JetBrains Mono',monospace",outline:"none"}}>
                      {P.models.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}
                {P.docs&&<a href={P.docs} target="_blank" rel="noopener noreferrer" style={{fontSize:"8px",color:"#3B82F6",textDecoration:"none"}}>Get API key →</a>}
              </div>
            )}
          </div>

          <div>
            <label style={{fontSize:"8px",color:T.tm,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"1.5px",display:"block",marginBottom:"3px"}}>EXAMPLES</label>
            <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
              {Object.entries(EXAMPLES).map(([k,ex])=>(<button key={k} onClick={()=>{setInput(ex.description);setActiveEx(k);}} style={{padding:isMobile?"6px 10px":"3px 7px",borderRadius:"4px",border:`1px solid ${activeEx===k?"#3B82F6":T.bdr}`,background:activeEx===k?"rgba(59,130,246,0.1)":"transparent",color:activeEx===k?"#3B82F6":T.ts,fontSize:isMobile?"10px":"9px",cursor:"pointer",minHeight:isMobile?"44px":"auto"}}>{ex.title}</button>))}
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column"}}>
            <label style={{fontSize:"8px",color:T.tm,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"1.5px",display:"block",marginBottom:"3px"}}>SOLUTION QUOTE</label>
            <textarea value={input} onChange={e=>{setInput(e.target.value);setActiveEx(null);}}
              placeholder="Paste solution description..."
              style={{minHeight:isMobile?"120px":"170px",maxHeight:isMobile?"200px":"none",flex:isMobile?"none":1,padding:isMobile?"10px":"8px",borderRadius:"4px",border:`1px solid ${T.bdr}`,background:T.bg,color:T.text,fontSize:isMobile?"14px":"10px",fontFamily:"'JetBrains Mono',monospace",lineHeight:"1.6",resize:"none",outline:"none"}}/>
          </div>

          <button onClick={()=>{if(hasKey&&input.trim()){generate(input.trim());if(isMobile)setDrawerOpen(false);}}} disabled={loading||!hasKey||!input.trim()}
            style={{padding:isMobile?"12px":"9px",borderRadius:"5px",border:"none",background:loading?T.bdr:"linear-gradient(135deg,#3B82F6,#6366F1)",color:"white",fontSize:isMobile?"12px":"11px",fontWeight:600,cursor:loading||!hasKey||!input.trim()?"default":"pointer",opacity:(!hasKey||!input.trim())?0.4:1,minHeight:isMobile?"48px":"auto"}}>
            {loading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}><span style={{width:"10px",height:"10px",border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid white",borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"}}/>Generating…</span>:`Generate via ${P.name}`}
          </button>

          {!hasKey&&input.trim()&&(
            <button onClick={()=>{setData(DEMO[activeEx]||DEMO.smb);}}
              style={{padding:isMobile?"10px":"7px",borderRadius:"5px",border:`1px solid ${T.bdr}`,background:"transparent",color:T.ts,fontSize:isMobile?"11px":"10px",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",minHeight:isMobile?"44px":"auto"}}>
              ▶ Demo (no key)
            </button>
          )}

          {error&&<div style={{padding:"5px 8px",borderRadius:"4px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#F87171",fontSize:"9px"}}>{error}</div>}

          {/* Edit mode info */}
          {editMode && data && (
            <div style={{padding:"8px",borderRadius:"4px",border:`1px solid ${T.selStroke}`,background:T.sel}}>
              <p style={{margin:0,fontSize:"8px",color:T.ts,lineHeight:"1.5"}}>
                <strong style={{color:T.selStroke}}>Edit Mode</strong><br/>
                <b>Drag</b> any node to reposition<br/>
                <b>Double-click</b> any text to edit<br/>
                Labels, params, connection labels, title — all editable<br/>
                SVG export uses your edits
              </p>
            </div>
          )}

          {/* Icon Guide */}
          <div style={{borderRadius:"5px",border:`1px solid ${T.bdr}`,overflow:"hidden",marginTop:"auto"}}>
            <button onClick={()=>setShowIcons(v=>!v)} style={{width:"100%",padding:"6px 10px",background:"transparent",border:"none",color:T.ts,fontSize:"9px",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",textAlign:"left",display:"flex",justifyContent:"space-between"}}>
              <span>Icon Guide</span><span>{showIcons?"▾":"▸"}</span>
            </button>
            {showIcons&&(
              <div style={{padding:"8px",borderTop:`1px solid ${T.bdr}`,background:T.bg,display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(3,1fr)",gap:isMobile?"8px":"6px",maxHeight:"280px",overflowY:"auto"}}>
                {Object.entries(CI).map(([name,Icon])=>(
                  <div key={name} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"6px 4px",borderRadius:"4px",background:T.srf,border:`1px solid ${T.bdr}`}}>
                    <svg viewBox="0 0 48 36" width="32" height="24" style={{color:T.c[name]||T.ts}}><Icon/></svg>
                    <span style={{fontSize:"7px",color:T.tm,fontFamily:"'JetBrains Mono',monospace",marginTop:"3px",textAlign:"center",wordBreak:"break-all"}}>{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main ref={dRef} style={{flex:1,display:"flex",alignItems:isMobile?"flex-start":"center",justifyContent:"center",overflow:"auto",padding:isMobile?"8px":"12px",WebkitOverflowScrolling:"touch"}}>
          {!data&&!loading&&(
            <div style={{textAlign:"center",maxWidth:"400px",opacity:0.4}}>
              <p style={{fontSize:"13px",fontWeight:600,color:T.ts,margin:"0 0 8px"}}>Network Topology Agent</p>
              <p style={{fontSize:"10px",color:T.tm,lineHeight:"1.5"}}>Generate → Edit → Export. Drag nodes, rename everything, then download as SVG.</p>
            </div>
          )}
          {loading&&(
            <div style={{textAlign:"center"}}>
              <div style={{width:"40px",height:"40px",margin:"0 auto 10px",border:`3px solid ${T.bdr}`,borderTop:"3px solid #3B82F6",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
              <p style={{color:T.tm,fontSize:"11px",fontFamily:"'JetBrains Mono',monospace"}}>Generating via {P.name}…</p>
            </div>
          )}
          {data&&<Topo data={data} setData={setData} cRef={dRef} theme={theme} editMode={editMode} isMobile={isMobile}/>}
        </main>
      </div>

      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        *{box-sizing:border-box;user-select:none}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${T.bdr};border-radius:3px}
        textarea::placeholder,input::placeholder{color:${T.tf}}
        textarea,input[type="text"],input[type="password"]{user-select:text}
        select{cursor:pointer}
      `}</style>
    </div>
  );
}
