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
