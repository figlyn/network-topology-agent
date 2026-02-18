interface Env {
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
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
        const headerKey = request.headers.get("x-api-key")?.trim();
        const apiKey = headerKey || env.ANTHROPIC_API_KEY;
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

    // Proxy /api/openai to OpenAI API
    if (url.pathname === "/api/openai" && request.method === "POST") {
      try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) {
          return new Response(JSON.stringify({ error: { message: "API key required" } }), {
            status: 401,
            headers: corsHeaders,
          });
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

    // Proxy /api/gemini to Google Gemini API
    if (url.pathname.startsWith("/api/gemini/") && request.method === "POST") {
      try {
        const model = url.pathname.replace("/api/gemini/", "");
        const apiKey = url.searchParams.get("key");
        if (!apiKey) {
          return new Response(JSON.stringify({ error: { message: "API key required" } }), {
            status: 401,
            headers: corsHeaders,
          });
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
