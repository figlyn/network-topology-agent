# Repository Guidelines

## Project Structure & Module Organization
- `src/App.jsx` contains most of the UI, SVG rendering, and LLM logic.
- `src/worker.ts` is the Cloudflare Worker that proxies LLM calls and serves MCP/widget endpoints.
- `src/mcp-server.ts` and `src/mcp-stdio.mjs` support the MCP integration path.
- `src/main.jsx` boots the React app.
- `public/` is currently empty; static assets are expected under `src`.
- `dist/` is the Vite build output (generated).

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` starts the Vite dev server (port 3000).
- `npm run build` produces a production build in `dist/`.
- `npm run preview` serves the production build locally.
- `npm run deploy` builds and deploys to Cloudflare Workers.
- `npm run deploy:staging` deploys to the staging Worker environment.

## Coding Style & Naming Conventions
- Use the existing style in `src/App.jsx`: 2-space indentation, double quotes, and semicolons.
- Prefer descriptive, sentence-case labels in UI strings (e.g., “Generate Topology”).
- Keep React components functional and co-located in `src/App.jsx` unless refactoring is intentional.
- No lint/format tooling is configured; avoid reformatting unrelated code.

## Testing Guidelines
- No automated tests are present. Validate changes by:
- `npm run dev` for interactive UI checks.
- `npm run build` to confirm production builds succeed.
- If you add tests, document them here and in `package.json` scripts.

## Apps SDK / MCP Notes
- ChatGPT apps use OpenAI’s Apps SDK (preview) built on MCP. Keep MCP changes aligned with the Apps SDK expectations.
- Connect the MCP server in ChatGPT by enabling Developer Mode, then adding the server under Apps & Connectors.

## Commit & Pull Request Guidelines
- Commit history uses short, imperative, sentence-case messages (e.g., “Add Cloudflare Worker proxy”).
- Avoid prefixes like `feat:` unless the repo adopts a convention later.
- PRs should include a clear summary, testing notes (`npm run dev`, `npm run build`), and screenshots for UI changes.

## Security & Configuration Tips
- LLM keys should not be committed. Use Cloudflare secrets, e.g., `npx wrangler secret put ANTHROPIC_API_KEY`.
- `wrangler.jsonc` controls Worker deployment and static asset bindings.

## Agent Notes
- See `CLAUDE.md` for architecture and deployment context.
- See `Notes_for_agent.md` for MCP/widget rendering pitfalls and troubleshooting context.
