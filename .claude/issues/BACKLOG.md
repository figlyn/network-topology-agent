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

_No active issues_

---

## Completed Issues

_Moved to CHANGELOG.md after verification_

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
