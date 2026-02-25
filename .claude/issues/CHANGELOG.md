# Changelog

Completed issues and releases. Moved from BACKLOG.md after verification.

## Format

```markdown
## [VERSION] - YYYY-MM-DD

### Added
- [Feature description] (ISSUE-ID)

### Fixed
- [Bug fix description] (ISSUE-ID)

### Changed
- [Change description] (ISSUE-ID)
```

---

## [Unreleased]

_Issues verified but not yet deployed_

---

## [v59] - 2026-02-25

### Fixed
- **Drag performance** (PERF-001): Changed drag handlers to use `throttledRender()` instead of `renderSVG()` for smoother 30fps+ drag operations
- **Icon jumping** (BUG-002): Fixed `attachEventHandlers()` to use fixed viewBox dimensions (1600×900) instead of scaled values, matching drag handlers

### Reverted
- **Render deduplication** (BUG-001): v58's `JSON.stringify(topology)` approach caused icon collapse regression - needs different fix

### Technical
- `throttledRender()` debounces rapid renders to max once per 100ms
- Consistent layout parameters across all functions (renderSVG, attachEventHandlers, drag handlers)
- v58 regression: JSON.stringify on topology object interfered with initial render timing

### Key Learning
- Naive render deduplication via JSON.stringify can cause subtle timing bugs
- Layout calculations must use consistent dimensions across all code paths

---

## [v54] - 2026-02-25

### Added
- **Clean loading UX** (UX-008): Shows status messages during streaming instead of partial diagram
- **Loading stages**: 🔄 Connecting → ⚡ Generating (with node count) → 🎨 Drawing → Complete
- **Time-based testing** (TESTER.md): Added performance measurement methodology

### Fixed
- **Connection rendering** (CONN-001): Use `toolOutput.topology` (complete) not `toolInput` (streamed/incomplete)
- **67% failure rate** (v50-v51): Extended polling timeout from 2.25s to 25s for ChatGPT streaming
- **Missing connections**: Prioritize server response over streamed input

### Changed
- Simplified `tryGetData()` to prioritize `toolOutput` (complete data with connections)
- Removed partial diagram rendering - show loading state until complete
- Extended polling: 70 attempts over 25 seconds (fast→medium→slow intervals)

### Technical
- `toolInput` = ChatGPT's streamed arguments (may be incomplete)
- `toolOutput` = Server's `structuredContent` response (always complete)
- `hasToolOutput` flag tracks when complete data is available
- `showLoading(stage, data)` displays progress during streaming
- Re-render triggered by `tool-result` notification or `openai:set_globals` event

### Key Learning
- ChatGPT streaming can take 5-10+ seconds for complex topologies
- Don't render partial data - better UX to show loading messages
- `toolOutput` is the authoritative source for complete topology data

---

## [v46] - 2026-02-24

### Added
- **Save modal visual guidance** (UX-007): Prominent instruction with icon (🖱️ for desktop, 👆 for touch), styled status bar, subtle pulse animation

### Fixed
- **iOS MCP compatibility** (IOS-001): Fixed "MCP write action is temporarily disabled" error on ChatGPT iOS app
- **Accept header injection**: ChatGPT iOS sends incomplete Accept header, now injected server-side
- **JSON response mode**: Enabled for better iOS compatibility vs SSE streaming

### Technical
- Added `readOnlyHint: true` annotation to mark tool as read-only (THE KEY FIX)
- Inject `text/event-stream` into Accept header when missing (iOS only sends `application/json`)
- `enableJsonResponse: true` in transport options for plain JSON instead of SSE

### Key Learning
- ChatGPT iOS treats MCP tools as "write actions" by default (blocked)
- Must explicitly mark read-only tools with `annotations: { readOnlyHint: true }`
- Accept header differences between iOS and web require server-side fix

---

## [v45] - 2026-02-23

### Fixed
- **Drag handler scale bug** (MOB-004): Fixed drag handlers using wrong scaled dimensions (was `1600*scale`, now fixed `1600`) causing tiny movements on touch devices
- **Save modal mobile display** (MOB-005): Convert SVG to PNG for reliable mobile long-press save; image now displays properly sized instead of in corner of large white sheet

### Technical
- Drag handlers now use fixed viewBox dimensions (1600×900) matching SVG viewBox
- Save converts SVG to PNG via canvas before showing modal
- PNG format works reliably with mobile long-press save gesture

---

## [v44] - 2026-02-23

### Added
- **Touch-friendly save modal** (MOB-003): Detects touch devices and shows "Long-press to save" instead of "Right-click"
- **Drag bounds checking** (UX-004): Nodes constrained within SVG viewBox, can't be dragged off-screen

### Fixed
- **Toolbar touch targets** (MOB-002): All buttons now ≥ 44x44px for better mobile tap accuracy

### Technical
- Touch detection: `'ontouchstart' in window || navigator.maxTouchPoints > 0`
- Bounds clamping accounts for node size (iW/iH) with 10px padding, 30px bottom padding for labels
- Both mouse and touch drag handlers have bounds checking

---

## [v41] - 2026-02-23

### Fixed
- **Save modal approach** (v40 rollback): Reverted to modal with right-click save after v40's hidden iframe approach failed due to sandbox restrictions

### Technical
- v40 hidden iframe approach blocked by sandbox `allow-downloads` restriction
- Modal with data URI image remains the only working save method in ChatGPT sandbox

---

## [v38] - 2026-02-23

### Added
- **Undo/Redo support** (UX-001): Cmd/Ctrl+Z undoes, Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y redoes
- **Keyboard shortcuts** (UX-002): Save (Cmd+S), Undo/Redo, Zoom (+/-), Escape to exit edit mode
- **Touch drag support** (MOB-001): Nodes can be dragged on touch devices
- **Zoom level indicator** (UX-003): Shows current zoom percentage (70%-180%)
- **SVG accessibility** (A11Y-001): Added `role="img"`, `aria-label`, and `<title>` element
- **Toolbar ARIA labels** (A11Y-002): All buttons have descriptive aria-labels
- **Status announcements**: aria-live region announces undo/redo/zoom actions

### Fixed
- History variable conflict with `window.history` (renamed to `undoStack`)

### Technical
- Undo history limited to 50 states
- Touch events use `passive: false` with `preventDefault()` to avoid scroll conflicts
- Keyboard shortcuts detect `metaKey` (Mac) or `ctrlKey` (Windows)

---

## [v37] - 2026-02-22

### Added
- Save modal with filename label derived from diagram title
- Suggested filename displayed below image in modal

### Fixed
- Save feature works within ChatGPT sandbox restrictions
- Modal shows selectable filename for easy copy

### Technical
- Workaround for sandbox `allow-downloads` restriction
- Uses data URI image with right-click save

---

## [v31] - 2026-02-21

### Fixed
- Connections now render reliably after streaming completes
- Stability-based rendering waits for connection count to stabilize

### Technical
- Track `connectionCountStableFor` across renders
- Only render connections after 3+ stable checks or `tool-result` received
- Retry mechanism polls every 400ms

---

## [v26] - 2026-02-20

### Added
- Widget metadata for ChatGPT Apps integration
- `openai/outputTemplate` and `openai/widgetAccessible` in `_meta`

---

## [v21] - 2026-02-19

### Added
- Dark mode support following system preference
- System fonts for better native feel
- `notifyIntrinsicHeight()` for proper ChatGPT sizing

---

## [v20] - 2026-02-18

### Added
- Initial ChatGPT widget with `toolInput` support
- Interactive SVG viewer with edit mode
- Drag-to-move nodes
- Double-click to edit labels
- Zoom controls
- SVG export

---

## Archive

### Pre-ChatGPT Versions

| Version | Date | Description |
|---------|------|-------------|
| v1-v19 | Pre-2026-02 | React app development, LLM integration |

---

## How to Add Entries

1. When issue is verified, move from BACKLOG.md
2. Add to `[Unreleased]` section
3. On deploy, rename `[Unreleased]` to version number
4. Create new `[Unreleased]` section
