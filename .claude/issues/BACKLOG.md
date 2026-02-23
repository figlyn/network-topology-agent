# Issue Backlog

Active issues and feature requests. Issues must have test cases defined in `TEST-CASES.md` before implementation.

## Status Legend

| Status | Meaning |
|--------|---------|
| `new` | Just identified, needs triage |
| `test-cases` | Needs test cases written |
| `ready` | Test cases defined, ready for dev |
| `in-progress` | Being worked on |
| `review` | Implemented, needs verification |
| `blocked` | Waiting on external dependency |

## Priority Legend

| Priority | Response |
|----------|----------|
| P0 | Critical - blocks usage |
| P1 | High - significant impact |
| P2 | Medium - should fix |
| P3 | Low - nice to have |

---

## Active Issues

### MOB-002: Toolbar Buttons Below 44px
- **Priority:** P2
- **Status:** `test-cases`
- **Component:** Widget
- **Reporter:** Mobile Tester Agent
- **Date:** 2026-02-23

**Description:**
Toolbar buttons are smaller than 44x44px minimum for touch targets.

**Acceptance Criteria:**
- [ ] All buttons ≥ 44px height
- [ ] All buttons ≥ 44px width (or adequate spacing)
- [ ] Tested at 375px viewport

---

### MOB-003: Save Modal Not Touch-Friendly
- **Priority:** P2
- **Status:** `test-cases`
- **Component:** Widget
- **Reporter:** Mobile Tester Agent
- **Date:** 2026-02-23

**Description:**
Save modal shows "right-click to save" which doesn't work on touch devices.

**Acceptance Criteria:**
- [ ] Touch devices show "Long-press to save" hint
- [ ] Long-press triggers native save menu
- [ ] Hint only shows on touch devices

---

---

### UX-004: Nodes Can Be Dragged Off-Screen
- **Priority:** P2
- **Status:** `new`
- **Component:** Widget
- **Reporter:** UX Auditor Agent
- **Date:** 2026-02-23

**Description:**
No bounds checking when dragging. Nodes can be moved outside visible canvas.

**Acceptance Criteria:**
- [ ] Nodes stay within SVG viewBox
- [ ] Visual feedback at boundary
- [ ] Can still position at edges

---

## Completed Issues

_Moved to CHANGELOG.md after verification_

---

## How to Add Issues

```markdown
### [CATEGORY]-[NUMBER]: [Short Title]
- **Priority:** P0/P1/P2/P3
- **Status:** `new`
- **Component:** Widget / Server / Schema
- **Reporter:** [Agent name or User]
- **Date:** YYYY-MM-DD

**Description:**
[What's wrong or what's needed]

**Acceptance Criteria:**
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
```

Categories: `UX`, `MOB` (mobile), `A11Y` (accessibility), `PERF`, `SEC`, `BUG`
