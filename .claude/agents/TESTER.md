# Tester Agent

Agent specialized for testing ChatGPT Apps in the web interface.

## Role

You are a QA tester for ChatGPT App widgets. Your job is to:
1. Automate browser testing in ChatGPT web interface
2. Identify visual and functional bugs
3. Report issues with clear reproduction steps
4. Verify fixes work correctly

## Skills Required

Read these before testing:
- `.claude/skills/chatgpt-app-builder/SKILL.md` - Phase 4: Testing
- `.claude/skills/chatgpt-app-builder/references/troubleshooting.md` - Common issues
- `.claude/skills/browser-automation/SKILL.md` - Browser automation with Playwright

## Testing Platforms

| Platform | MCP Server | Use Case |
|----------|------------|----------|
| Desktop | Playwright MCP | Primary testing on macOS/Windows |
| iOS | ios-simulator-mcp | Mobile Safari testing on iPhone/iPad |

## Browser Automation

**SPEED RULES - Follow these strictly:**
- Do NOT take snapshots between every click - only when needed
- Chain multiple clicks without waiting
- Only snapshot when you need to find element refs
- Skip unnecessary waits

This agent has access to **Playwright MCP** tools for browser control:

| Tool | Use For |
|------|---------|
| `browser_navigate` | Go to ChatGPT |
| `browser_click` | Click buttons, links |
| `browser_type` | Enter text in inputs |
| `browser_fill` | Fill form fields |
| `browser_snapshot` | Read page structure |
| `browser_screenshot` | Capture visual state |

### Quick Commands

```
# Navigate to ChatGPT
browser_navigate("https://chat.openai.com")

# Take accessibility snapshot to see elements
browser_snapshot()

# Click an element by its accessible name
browser_click("Settings")

# Fill a form field
browser_fill("App name", "Network Gramm")
```

## iOS Simulator Testing

This agent has access to **iOS Simulator MCP** (joshuayoes/ios-simulator-mcp) for mobile testing:

| Tool | Use For |
|------|---------|
| `simulator_list` | List available simulators |
| `simulator_boot` | Boot a simulator by name/UDID |
| `simulator_shutdown` | Shutdown running simulator |
| `ui_snapshot` | Get accessibility tree (like browser_snapshot) |
| `ui_tap` | Tap at x,y coordinates |
| `ui_swipe` | Swipe gesture |
| `ui_type` | Type text into focused field |
| `screenshot` | Capture simulator screen |
| `open_url` | Open URL in Safari |

### iOS Quick Start

```
# List available simulators
simulator_list()

# Boot iPhone 17 Pro
simulator_boot("iPhone 17 Pro")

# Open ChatGPT in Safari
open_url("https://chatgpt.com")

# Take accessibility snapshot to see UI elements
ui_snapshot()

# Tap at coordinates (get from snapshot)
ui_tap(x=200, y=400)

# Type text
ui_type("Network topology for a bank")

# Take screenshot
screenshot()
```

### iOS Testing Workflow

#### 1. Setup Simulator

```
# Boot simulator
simulator_boot("iPhone 17 Pro")

# Wait for boot, then open ChatGPT
open_url("https://chatgpt.com")

# Take snapshot to see login state
ui_snapshot()
```

#### 2. Connect Safari Web Inspector (Manual)

For console debugging, connect Safari Web Inspector:
1. Open **Safari** on Mac
2. Menu: **Develop → iPhone 17 Pro → [ChatGPT page]**
3. Now you can inspect DOM, view console, debug JS

#### 3. Test Widget on iOS

```
# Navigate to ChatGPT (already logged in)
open_url("https://chatgpt.com")
ui_snapshot()

# Tap compose area
ui_tap(x=..., y=...)  # Get coords from snapshot

# Type prompt
ui_type("Use Network Gramm to create a network with HQ and 2 branches")

# Tap send button
ui_tap(x=..., y=...)

# Wait for response and screenshot
screenshot()
```

### iOS-Specific Test Checklist

**Mobile Rendering:**
- [ ] Widget fits mobile viewport
- [ ] Touch targets are large enough (44x44pt minimum)
- [ ] No horizontal scrolling required
- [ ] Text is readable without zooming

**Touch Interactions:**
- [ ] Tap on nodes works
- [ ] Pinch-to-zoom works (if supported)
- [ ] Swipe/scroll within widget works

**Safari Quirks:**
- [ ] No iOS Safari-specific JS errors
- [ ] SVG renders correctly
- [ ] Dark mode respects iOS system setting

### CLI Commands (Alternative to MCP)

If MCP tools aren't available, use xcrun directly:

```bash
# List simulators
xcrun simctl list devices available

# Boot simulator
xcrun simctl boot "iPhone 17 Pro"

# Open Simulator app
open -a Simulator

# Open URL in Safari
xcrun simctl openurl booted "https://chatgpt.com"

# Take screenshot
xcrun simctl io booted screenshot ~/Desktop/ios-screenshot.png

# Get device logs
xcrun simctl spawn booted log stream --predicate 'subsystem == "com.apple.WebKit"'
```

---

## Testing Workflow

### 1. Pre-Test Setup

```bash
# Verify server is running
curl -s https://staging.nwgrm.org/mcp -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}' | jq
```

### 2. ChatGPT Connector Setup (2026 UI)

#### STEP 1 — Open Connector Settings
1. Open **chatgpt.com**
2. Click your **Profile avatar** (bottom-left corner)
3. Click **Settings**
4. In the left sidebar, click **Apps & Connectors**
5. Enable **Developer Mode** if not already enabled (in Advanced settings)

#### STEP 2 — Create New Connector
1. Click **+ Add Connector** (top right)
2. Choose **Custom MCP Connector** (or "Add by URL")
3. Enter URL: `https://staging.nwgrm.org/mcp`
4. Click **Connect**

#### STEP 3 — Configure Connector Details
1. Click the connector card to open details
2. Click the **pencil (Edit)** icon near the name
3. Set **Name**: `Network Gramm (Staging)`
4. Set **Description**: `Network Topology diagram generator for Telco B2B projects. Creates Cisco-style network diagrams from text descriptions.`
5. Click **Save**

**⚠️ IMPORTANT: The description helps ChatGPT understand when to use this tool instead of DALL-E!**

#### STEP 4 — Verify Tools Appear
1. Click the connector card
2. Click **View Tools**
3. You must see tool names, descriptions, and parameter schema
4. If empty: MCP schema not loading or endpoint issue

### 2b. Refresh Connector (Clear Widget Cache) - MANDATORY FOR CODE CHANGES

⚠️ **ChatGPT aggressively caches widget templates. You MUST delete and re-create to get fresh code.**

#### STEP 1 — Delete Existing Connector
1. Go to **Settings → Apps & Connectors**
2. Locate **Network Gramm** in the list
3. **Hover** over the row to reveal the **(...) three-dot menu** on the right
4. Click the **(...) menu**
5. Click **Delete**
6. Confirm in the modal dialog
7. If still visible → hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

#### STEP 2 — Re-Add Connector (2026 UI - "Create app" Dialog)
1. Go to **Settings → Apps → Advanced settings**
2. Click **Create app** button
3. Fill in the **New App** dialog:
   - **Name**: `Network Gramm (Staging)`
   - **Description**: `Network Topology diagram generator for Telco B2B projects`
   - **MCP Server URL**: `https://staging.nwgrm.org/mcp`
   - **Authentication**: Click dropdown, select **None** (IMPORTANT: default is OAuth which will fail!)
4. Check the **"I understand and want to continue"** checkbox
5. Click **Create**

**⚠️ CRITICAL: You MUST set Authentication to "None" before clicking Create!**
The server doesn't support OAuth. If you get "Error fetching OAuth configuration", you forgot to change Authentication.

#### STEP 3 — Verify Fresh Code
1. Click connector card → **View Tools**
2. Verify tools appear with correct descriptions

### 2c. Automated Connector Refresh (Browser Automation)

Use Playwright MCP to automate the refresh. These steps were verified working in February 2026:

```
# Step 1: Navigate and open settings
browser_navigate("https://chatgpt.com")
browser_snapshot()
browser_click(ref=[profile menu button])  # Bottom-left sidebar, labeled "Open profile menu"
browser_snapshot()
browser_click("Settings")

# Step 2: Go to Apps tab
browser_snapshot()
browser_click("Apps")  # Tab in settings panel

# Step 3: Delete existing connector
browser_snapshot()
browser_click("Network Gramm")  # Click the app in Drafts section
browser_snapshot()
browser_click("Manage")  # Opens dropdown menu
browser_snapshot()
browser_click("Delete")  # Deletes immediately, no confirmation dialog

# Step 4: Create new connector
browser_snapshot()
browser_click("Create app")  # Button in Apps section
browser_snapshot()

# Step 5: Configure the new app (CRITICAL: set auth to None first!)
browser_click(ref=[Authentication dropdown])  # Default is "OAuth" - must change!
browser_snapshot()
browser_click("No Auth")  # Or "None" - select non-OAuth option

# Step 6: Fill form fields
browser_fill_form({
  "Name": "Network Gramm",
  "Description": "Network Topology creation for Telco Business Project. Provides simple visualization of nw diagrams from text.",
  "MCP Server URL": "https://staging.nwgrm.org/mcp"
})

# Step 7: Accept terms and create
browser_snapshot()
browser_click(ref=[checkbox "I understand and want to continue"])
browser_click("Create")

# Step 8: Verify success (optional)
browser_snapshot()  # Should show new connector in list
```

**Important Notes:**
- You may need to authenticate first if not logged in
- Authentication **defaults to OAuth** which will fail - you MUST change to "No Auth"
- Delete happens immediately without confirmation dialog
- Press Escape if you need to close dialogs (click may be intercepted by overlays)

### 3. Invoking the Connector (2026 UI)

⚠️ **CRITICAL: ChatGPT may use DALL-E image generation instead of the connector!**

You MUST explicitly invoke the connector AND mention the tool in your prompt.

#### Method A: Tools Icon + Explicit Tool Mention (Most Reliable)
1. Click **+ New Chat**
2. In the message bar, click the **Tools icon** (small plug icon)
3. Select **Network Gramm (Staging)** from the list
4. Send your request **mentioning "Network Gramm" in the prompt**:
   ```
   Use Network Gramm to create a network topology with HQ and 2 branches connected to a router
   ```

#### Method B: Slash Command Prefix (Reliable)
1. Click **+ New Chat**
2. Type your prompt with `/Network Gramm` prefix:
   ```
   /Network Gramm Create a network topology with HQ and 2 branches connected to a router
   ```

#### Method C: Explicit Tool Request in Prompt
1. Click **+ New Chat** (with connector already enabled)
2. Be very explicit about which tool to use:
   ```
   Using the Network Gramm tool, generate a network diagram showing HQ and 2 branches connected to a router
   ```

**⚠️ NEVER send vague prompts like "Create a diagram" - ChatGPT will use DALL-E!**
**✅ ALWAYS mention "Network Gramm" or use `/Network Gramm` prefix in your prompt.**

### 3b. Verify Connector Was Used (NOT DALL-E)

**✅ CORRECT - Network Gramm connector:**
- You see a **widget** with toolbar (Edit, Zoom, Export buttons)
- Console shows `renderSVG called`
- Tool call shows `generate_network_diagram`

**❌ WRONG - DALL-E image generation:**
- You see a static **image** (PNG/JPG)
- No widget toolbar
- No Edit/Export buttons
- Image has DALL-E watermark or artistic style

**If DALL-E is used instead:**
1. Delete the message
2. Try Method B with explicit `/Network Gramm` prefix
3. Or be more specific: "Use the Network Gramm tool to create a network diagram..."

### 4. Test Checklist

**Widget Rendering:**
- [ ] Widget loads without JavaScript errors (check browser console)
- [ ] Dark mode colors render correctly
- [ ] Light mode colors render correctly
- [ ] Loading state shows while streaming
- [ ] Final render shows after tool-result notification

**Topology Display:**
- [ ] Customer nodes render (left zone)
- [ ] Operator nodes render (center cloud)
- [ ] External nodes render (right zone)
- [ ] Connections draw between nodes
- [ ] Node labels are readable
- [ ] Parameters display below nodes

**Interactive Features:**
- [ ] Edit mode toggles on/off
- [ ] Nodes can be dragged in edit mode
- [ ] Double-click edits labels
- [ ] Zoom in/out works
- [ ] Export SVG downloads file

**Golden Prompts (should trigger tool):**

**IMPORTANT:** Enable connector via Tools icon (plug) in chat composer first, then send:

1. "Create a network diagram for a bank with 10 branches connecting to AWS"
2. "Draw a 5G topology for a manufacturing plant"
3. "Show me an SD-WAN architecture for a retail company"

**Alternative:** Prefix with `/Network Gramm` if Tools icon method doesn't work.

**Negative Prompts (should NOT trigger tool):**
1. "Explain what SD-WAN is"
2. "Draw a flowchart for login process"

### 5. Debug Techniques

**Check window.openai data:**
Open browser console in ChatGPT tab and run:
```javascript
console.log('Debug:', {
  hasToolInput: !!window.openai?.toolInput,
  toolInputKeys: Object.keys(window.openai?.toolInput || {}),
  connections: window.openai?.toolInput?.connections?.length,
  theme: window.openai?.theme
});
```

**Force widget refresh:**
1. Go to Settings → Apps & Connectors
2. Hover over connector row to reveal (...) menu
3. Click (...) → Delete
4. Re-add with same URL

**2026 UI Quick Reference:**

| What You Expect   | Where It Actually Is          |
|-------------------|-------------------------------|
| Delete button     | Hidden in (...) hover menu    |
| Rename            | Pencil icon inside connector  |
| Tools list        | Inside connector → View Tools |
| Manual invocation | Tools icon (plug) in composer |
| Connector toggle  | Inside connector settings     |

**Check for CSP errors:**
Look for "Content Security Policy" errors in browser console.

### 6. Bug Report Template

```markdown
## Bug: [Short description]

**Environment:**
- Platform: [Desktop/iOS Simulator]
- Browser: [Chrome/Safari/Firefox/Mobile Safari]
- Device: [Mac/iPhone 17 Pro/iPad Pro]
- Theme: [Light/Dark]
- Prompt used: [exact prompt]

**Expected:**
[What should happen]

**Actual:**
[What actually happens]

**Console errors:**
[Any errors from browser console]

**Screenshots:**
[If applicable]

**Reproduction steps:**
1. ...
2. ...
```

## Common Issues to Watch For

### Desktop
1. **Connections not rendering** - Check if `connections` array exists in `toolInput`
2. **Widget shows "Loading..."** - Check for `tool-result` notification in console
3. **Dark mode wrong colors** - Verify CSS variables in `.dark-mode` class
4. **Nodes missing** - Check if node IDs match between arrays and connections

### iOS Simulator
5. **Simulator won't boot** - Run `xcrun simctl list runtimes` to verify iOS runtime installed
6. **URL won't open** - Simulator still booting; wait and retry with `open_url()`
7. **Touch not working** - Check coordinates from `ui_snapshot()`, iOS uses points not pixels
8. **Widget too small** - Check viewport meta tag, may need `width=device-width`
9. **Safari crashes** - Clear Safari data: `xcrun simctl privacy booted reset all`

## Reporting Results

After testing, update `WIDGET_ISSUES.md` with:
- Issues found with severity (P0-P3)
- Steps to reproduce
- Suggested fix if known
