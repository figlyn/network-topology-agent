---
name: session-wrap-up
description: Create an end-of-session engineering wrap-up with current status, completed work, validation results, open risks, and concrete next actions. Use when the user asks to close out a work session, summarize progress, record where things stand, or prepare handoff notes.
---

# Session Wrap Up

Use this workflow to end a session with a durable, execution-focused summary.

## Workflow

1. Capture factual state from the workspace.
- Run `git status --short`.
- Run `git diff --name-only`.
- If needed, run `git log --oneline -n 10` to anchor recent changes.

2. Record what was completed.
- List implemented changes and why they were made.
- Reference exact files touched.
- Separate code changes from infra/config changes.

3. Record verification status.
- List commands run for verification (build/tests/deploy/checks).
- Mark each as `passed`, `failed`, or `not run`.
- Note any environment limitations that blocked checks.

4. Record current standing.
- State what is working now.
- State what is still broken, unknown, or risky.
- Include external dependencies (credentials, Cloudflare settings, API limits, etc.).

5. Define immediate next actions.
- Provide 1-5 prioritized steps.
- Keep each step concrete and executable.

## Output Template

Use this exact section structure:

- `Session Summary`
- `Completed`
- `Validation`
- `Current State`
- `Open Risks`
- `Next Actions`

Keep the write-up concise and operational. Prefer file paths, command names, and specific states over narrative text.
