import { handleMcpHttp, handleRenderRequest } from "./mcp-server";
import { corsResponse, jsonResponse, errorResponse } from "./cors";

// Cloudflare Workers types
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return corsResponse();
    }

    // MCP endpoint for ChatGPT Apps
    if (url.pathname === "/mcp") {
      return handleMcpHttp(request);
    }

    // Direct SVG render endpoint (for image URLs)
    if (url.pathname === "/render") {
      return handleRenderRequest(request);
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
