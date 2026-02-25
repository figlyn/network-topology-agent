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

### BUG-001: Diagram renders twice
- **Priority:** P2 (downgraded)
- **Status:** `blocked`
- **Component:** Widget
- **Reporter:** User
- **Date:** 2026-02-25

**Description:**
The topology diagram renders/displays twice during loading.

**Notes:**
- v58 attempted fix using `JSON.stringify(topology)` deduplication - caused icon collapse regression
- Reverted in v59 - needs different approach (possibly hash-based or render flag)

**Acceptance Criteria:**
- [ ] Diagram renders only once
- [ ] No duplicate or flickering display

**Test Cases:** TC-BUG001-01 through TC-BUG001-05 (5 tests)

---

### PERF-001: Rendering too slow
- **Priority:** P1
- **Status:** `completed`
- **Component:** Widget
- **Reporter:** User
- **Date:** 2026-02-25
- **Fixed:** v59

**Description:**
Takes too long to render the topology diagram.

**Fix:** Changed drag handlers to use `throttledRender()` instead of `renderSVG()` (mcp-server.ts:600, 645)

**Acceptance Criteria:**
- [x] Drag operations maintain 30fps
- [x] Loading state is responsive

**Test Cases:** TC-PERF001-01 through TC-PERF001-07 (7 tests)

---

### BUG-002: Icons jumping during edits
- **Priority:** P2
- **Status:** `completed`
- **Component:** Widget
- **Reporter:** User
- **Date:** 2026-02-25
- **Fixed:** v59

**Description:**
Icons/nodes jump or shift position during edit mode interactions.

**Fix:** Changed `attachEventHandlers()` to use fixed viewBox dimensions (1600x900) instead of scaled values (mcp-server.ts:438)

**Acceptance Criteria:**
- [x] Icons stay stable during edits
- [x] No visual jumping or jittering

**Test Cases:** TC-BUG002-01 through TC-BUG002-11 (11 tests)

---

### UX-007: Save Modal Visual Guidance
- **Priority:** P2
- **Status:** `completed`
- **Component:** Widget
- **Reporter:** UX Auditor Agent
- **Date:** 2026-02-24

**Description:**
The save modal shows "Right-click to save" (desktop) or "Long-press to save" (touch), but users may not notice or understand these instructions. The modal lacks visual emphasis to guide users to the correct action.

**Current Behavior:**
- Modal shows PNG image with text instruction below
- Text is small and easy to miss
- No visual cue pointing to the image

**Proposed Improvement:**
- Add visual emphasis to the save instruction (e.g., pulsing animation, icon, or highlighted text)
- Consider adding a brief animation or pointer to draw attention to the image
- Make the instruction more prominent

**Acceptance Criteria:**
- [ ] Save instruction is visually prominent (not just plain text)
- [ ] Desktop users clearly understand to right-click the image
- [ ] Touch users clearly understand to long-press the image
- [ ] Visual guidance works in both light and dark modes
- [ ] Animation/effect is subtle, not distracting

---

## Completed Issues

_Moved to CHANGELOG.md after verification_

### Recently Completed (v59)
- **PERF-001**: Throttled drag rendering - Fixed in v59
- **BUG-002**: Icon jumping during edits - Fixed in v59

### Recently Completed (v45)
- **MOB-004**: Drag handler scale bug - Fixed in v45
- **MOB-005**: Save modal mobile display - Fixed in v45

### Recently Completed (v44)
- **MOB-002**: Toolbar touch targets 44px - Verified
- **MOB-003**: Touch-friendly save modal - Verified
- **UX-004**: Drag bounds checking - Verified

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
