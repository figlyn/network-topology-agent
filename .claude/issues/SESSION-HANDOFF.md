# Session Handoff

Last updated: 2026-02-27

## Current Branch

`feature/fullscreen-edit-overlay`

## Deployed to Production

**v68** is now live on production.

### v68 Release Summary

| Feature | Description |
|---------|-------------|
| **Native file download** | Uses File System API with privacy disclosure for trusted save experience |
| **Font sizes reduced** | All fonts at 75% of previous size for better visual balance |
| **Zone label consistency** | Ingress/Egress labels now use fs.zone (14*s) like other zone labels |
| **MOB-006** | iOS safe area fix - toolbar no longer hidden under status bar |
| **UX-008** | Changed inline button from "Edit" to "Expand" for clarity |
| **PERF-002** | Smooth 60fps drag using requestAnimationFrame |

## Current Versions

| Environment | Version |
|-------------|---------|
| Production | v68 |
| Staging | v68 |
| Local | v68 |

## Known Issues Still Open

| Issue | Priority | Status |
|-------|----------|--------|
| BUG-001 | P2 | blocked - Diagram renders twice |
| UX-007 | P2 | new - Save modal visual guidance |

## Next Session Init

```bash
# 1. Read the skill first
Read: .claude/skills/chatgpt-app-builder/SKILL.md

# 2. Run tests
npm run test:run && npm run typecheck

# 3. Check BACKLOG.md for open issues
Read: .claude/issues/BACKLOG.md
```

## Agent Instructions

To continue development:

```bash
# Review open issues
Task: "Read .claude/agents/ORCHESTRATOR.md. Review open issues in BACKLOG.md and prioritize next work."

# Test specific feature
Task: "Read .claude/agents/TESTER.md. Verify v68 features on production."

# Mobile testing
Task: "Read .claude/agents/MOBILE-TESTER.md. Test v68 on iOS Safari."
```
