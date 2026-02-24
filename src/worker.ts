import { handleMcpHttp, handleRenderRequest } from "./mcp-server";
import { corsResponse, jsonResponse, errorResponse } from "./cors";

// Cloudflare Workers types
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY?: string;
  OPENAI_CHALLENGE_TOKEN?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return corsResponse();
    }

    // OpenAI App Store challenge endpoint
    if (url.pathname === "/.well-known/openai-apps-challenge") {
      const token = env.OPENAI_CHALLENGE_TOKEN || "PLACEHOLDER_TOKEN_SET_VIA_ENV";
      return new Response(token, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      return jsonResponse({
        status: "ok",
        version: "1.0.0",
      });
    }

    // Privacy policy page
    if (url.pathname === "/privacy") {
      return new Response(PRIVACY_POLICY_HTML, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // Terms of service page
    if (url.pathname === "/terms") {
      return new Response(TERMS_OF_SERVICE_HTML, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // MCP endpoint for ChatGPT Apps
    if (url.pathname === "/mcp") {
      return handleMcpHttp(request);
    }

    // Direct SVG render endpoint (for image URLs)
    if (url.pathname === "/render") {
      return handleRenderRequest(request);
    }

    // Download endpoint - returns SVG with proper Content-Disposition filename
    if (url.pathname === "/download" && request.method === "POST") {
      try {
        let svg: string | null = null;
        let filename: string | null = null;

        const contentType = request.headers.get("Content-Type") || "";

        if (contentType.includes("application/json")) {
          const json = await request.json() as { svg: string; filename: string };
          svg = json.svg;
          filename = json.filename;
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
          const formData = await request.formData();
          svg = formData.get("svg") as string;
          filename = formData.get("filename") as string;
        }

        if (!svg || !filename) {
          return errorResponse("Missing svg or filename", 400);
        }

        // Sanitize filename
        const safeFilename = filename.replace(/[^a-zA-Z0-9-_. ]/g, '').trim() || 'diagram.svg';

        return new Response(svg, {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml",
            "Content-Disposition": `attachment; filename="${safeFilename}"`,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      } catch {
        return errorResponse("Download error", 500);
      }
    }

    // Proxy /api/anthropic to Anthropic API
    if (url.pathname === "/api/anthropic" && request.method === "POST") {
      try {
        const headerKey = request.headers.get("x-api-key")?.trim();
        const apiKey = headerKey || env.ANTHROPIC_API_KEY;

        // Debug logging
        console.log("API Key source:", headerKey ? "user-provided" : (env.ANTHROPIC_API_KEY ? "env-secret" : "none"));

        if (!apiKey) {
          console.log("ERROR: No API key available");
          return errorResponse("API key required", 401);
        }

        const body = await request.json();

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();
        return jsonResponse(data, response.status);
      } catch {
        return errorResponse("Proxy error", 500);
      }
    }

    // Proxy /api/openai to OpenAI API
    if (url.pathname === "/api/openai" && request.method === "POST") {
      try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) {
          return errorResponse("API key required", 401);
        }

        const body = await request.json();

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();
        return jsonResponse(data, response.status);
      } catch {
        return errorResponse("Proxy error", 500);
      }
    }

    // Proxy /api/gemini to Google Gemini API
    if (url.pathname.startsWith("/api/gemini/") && request.method === "POST") {
      try {
        const model = url.pathname.replace("/api/gemini/", "");
        const apiKey = url.searchParams.get("key");
        if (!apiKey) {
          return errorResponse("API key required", 401);
        }

        const body = await request.json();

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );

        const data = await response.json();
        return jsonResponse(data, response.status);
      } catch {
        return errorResponse("Proxy error", 500);
      }
    }

    // Serve static assets for all other requests
    return env.ASSETS.fetch(request);
  },
};

// Privacy Policy HTML
const PRIVACY_POLICY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Network Gramm</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 { color: #1a1a1a; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
    h2 { color: #1a1a1a; margin-top: 30px; }
    .last-updated { color: #666; font-style: italic; margin-bottom: 30px; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p class="last-updated">Last updated: February 2026</p>

  <h2>Overview</h2>
  <p>Network Gramm ("we", "our", or "the Service") is a network topology diagram generation tool. We are committed to protecting your privacy and being transparent about our data practices.</p>

  <h2>Information We Process</h2>
  <p>When you use Network Gramm through ChatGPT:</p>
  <ul>
    <li><strong>Diagram Data:</strong> The network topology descriptions you provide are processed to generate diagrams. This data is processed in real-time and is not stored on our servers.</li>
    <li><strong>Technical Data:</strong> Standard web server logs may include IP addresses, browser type, and request timestamps for security and operational purposes.</li>
  </ul>

  <h2>What We Do NOT Collect</h2>
  <ul>
    <li>Personal identification information</li>
    <li>User accounts or credentials</li>
    <li>Cookies or tracking identifiers</li>
    <li>Your generated diagrams (they are rendered on-demand and not stored)</li>
  </ul>

  <h2>Data Processing</h2>
  <p>All diagram generation occurs in real-time. When you request a network diagram:</p>
  <ol>
    <li>Your topology description is sent to our service</li>
    <li>We generate an SVG diagram based on your input</li>
    <li>The diagram is returned to ChatGPT for display</li>
    <li>No data is retained after the request is complete</li>
  </ol>

  <h2>Third-Party Services</h2>
  <p>Network Gramm operates as a ChatGPT App. Your use of ChatGPT is governed by <a href="https://openai.com/policies/privacy-policy" target="_blank">OpenAI's Privacy Policy</a>.</p>

  <h2>Data Security</h2>
  <p>We use industry-standard security measures including HTTPS encryption for all communications. Our service is hosted on Cloudflare Workers infrastructure.</p>

  <h2>Changes to This Policy</h2>
  <p>We may update this privacy policy from time to time. Significant changes will be reflected in the "Last updated" date.</p>

  <h2>Contact Us</h2>
  <p>If you have questions about this privacy policy, please contact us at: <a href="mailto:info@nwgrm.org">info@nwgrm.org</a></p>
</body>
</html>`;

// Terms of Service HTML
const TERMS_OF_SERVICE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service - Network Gramm</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 { color: #1a1a1a; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
    h2 { color: #1a1a1a; margin-top: 30px; }
    .last-updated { color: #666; font-style: italic; margin-bottom: 30px; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>Terms of Service</h1>
  <p class="last-updated">Last updated: February 2026</p>

  <h2>1. Acceptance of Terms</h2>
  <p>By using Network Gramm ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>

  <h2>2. Description of Service</h2>
  <p>Network Gramm is an AI-powered tool that generates network topology diagrams. The Service is provided as a ChatGPT App and creates visual representations of network architectures based on text descriptions.</p>

  <h2>3. Use of Service</h2>
  <p>You agree to use the Service only for lawful purposes. You may not:</p>
  <ul>
    <li>Use the Service to generate content that infringes on intellectual property rights</li>
    <li>Attempt to disrupt or overload the Service</li>
    <li>Use automated systems to access the Service in a manner that exceeds reasonable use</li>
    <li>Reverse engineer or attempt to extract the source code of the Service</li>
  </ul>

  <h2>4. Generated Content</h2>
  <p>Diagrams generated by Network Gramm are provided for informational and planning purposes. You retain ownership of the concepts you describe, and may use the generated diagrams for personal or commercial purposes.</p>

  <h2>5. Disclaimer of Warranties</h2>
  <p>The Service is provided "as is" without warranties of any kind, either express or implied. We do not guarantee that:</p>
  <ul>
    <li>The Service will be uninterrupted or error-free</li>
    <li>Generated diagrams will be accurate or suitable for any particular purpose</li>
    <li>The Service will meet your specific requirements</li>
  </ul>

  <h2>6. Limitation of Liability</h2>
  <p>To the maximum extent permitted by law, Network Gramm and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</p>

  <h2>7. Third-Party Services</h2>
  <p>Network Gramm operates as a ChatGPT App. Your use of ChatGPT is subject to <a href="https://openai.com/policies/terms-of-use" target="_blank">OpenAI's Terms of Use</a>.</p>

  <h2>8. Modifications</h2>
  <p>We reserve the right to modify or discontinue the Service at any time without notice. We may also update these Terms of Service, with changes taking effect upon posting.</p>

  <h2>9. Governing Law</h2>
  <p>These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.</p>

  <h2>10. Contact</h2>
  <p>For questions about these Terms of Service, please contact: <a href="mailto:info@nwgrm.org">info@nwgrm.org</a></p>
</body>
</html>`;
