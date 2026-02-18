interface Env {
  ASSETS: Fetcher;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  "Content-Type": "application/json",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Proxy /api/anthropic to Anthropic API
    if (url.pathname === "/api/anthropic" && request.method === "POST") {
      try {
        const apiKey = request.headers.get("x-api-key");
        if (!apiKey) {
          return new Response(JSON.stringify({ error: { message: "API key required" } }), {
            status: 401,
            headers: corsHeaders,
          });
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
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: corsHeaders,
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: { message: "Proxy error" } }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    // Serve static assets for all other requests
    return env.ASSETS.fetch(request);
  },
};
