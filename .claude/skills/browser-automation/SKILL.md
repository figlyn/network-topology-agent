# Browser Automation Skill

Automate browser interactions using Microsoft Playwright MCP.

## Prerequisites

Playwright MCP must be registered:
```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

## Available Tools

Once enabled, these MCP tools are available:

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to a URL |
| `browser_click` | Click an element |
| `browser_type` | Type text into an input |
| `browser_snapshot` | Get accessibility tree snapshot |
| `browser_screenshot` | Take a screenshot |
| `browser_hover` | Hover over element |
| `browser_select_option` | Select dropdown option |
| `browser_fill` | Fill a form field |
| `browser_evaluate` | Run JavaScript in page |

## Common Workflows

### Login to ChatGPT

```
1. browser_navigate to https://chat.openai.com
2. browser_snapshot to see the page structure
3. browser_click on "Log in" button
4. browser_type email in email field
5. browser_type password in password field
6. browser_click on submit button
```

### Refresh ChatGPT Connector

```
1. browser_navigate to https://chat.openai.com
2. browser_click on Settings (gear icon)
3. browser_click on "Connectors" in sidebar
4. browser_snapshot to find "Network Gramm"
5. browser_click on "Network Gramm"
6. browser_click on "Delete"
7. browser_click on "Create new connector"
8. browser_fill "App name" with "Network Gramm"
9. browser_fill "Description" with "Network Topology creation..."
10. browser_fill "MCP URL" with "https://staging.nwgrm.org/mcp"
11. browser_click on "No Auth"
12. browser_click on "I understand" checkbox
13. browser_click on "Create"
```

### Test Widget in ChatGPT

```
1. browser_navigate to https://chat.openai.com
2. browser_click on "New chat"
3. browser_click on "More" menu
4. browser_click to add "Network Gramm" connector
5. browser_type test prompt in message input
6. browser_click send button
7. browser_snapshot to verify widget renders
8. browser_screenshot to capture result
```

## Tips

- **Use `browser_snapshot` first** - Always snapshot before clicking to see element structure
- **Accessibility tree** - Playwright uses accessibility labels, not CSS selectors
- **Headless mode** - Default is headless; add `--headed` for visible browser
- **Authentication** - ChatGPT may require manual login first, then browser can take over

## Limitations

- **ChatGPT 2FA** - May need manual handling for 2FA/CAPTCHA
- **Session persistence** - Sessions don't persist by default
- **Rate limits** - Don't automate too fast, ChatGPT may rate limit

## Configuration Options

```bash
# Run with visible browser
claude mcp add playwright -- npx @playwright/mcp@latest --headed

# Use specific browser
claude mcp add playwright -- npx @playwright/mcp@latest --browser firefox

# Persistent user profile (keeps login)
claude mcp add playwright -- npx @playwright/mcp@latest --user-data-dir ~/.playwright-profile
```
