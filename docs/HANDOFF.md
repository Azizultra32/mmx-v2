# MMX v2 — HANDOFF

Minimal restart context for next session or next agent.

## Where We Are

Building the 4-surface model refactor. Current session completed:
- Full 8-stage pipeline (dryRun mode proven)
- Dashboard UI (dark theme, LaunchBar, HumanGate, CSS fixed)
- 164 tests passing, 0 TypeScript errors
- Pushed to github.com/Azizultra32/mmx-v2

## What To Do Next

Read in this order:
1. `docs/CANON.md` — non-negotiables
2. `docs/ACCEPTANCE.md` — done criteria
3. `docs/CURRENT_STATE.md` — current gaps
4. `docs/TASK_LOG.md` — last completed task
5. This file

Then implement one task at a time from the implementation plan:
`docs/plans/2026-03-12-4-surface-model.md`

## Critical Context

- Engine: `~/mmx-v2/` — never use as target
- Workspace currently: `<target>/.metamatrix/` — needs rename to `.mmx/`
- Cost: Agent SDK / Max subscription — NOT real API billing
- Run IDs: currently `mmx-<hex>` — needs to become `run-001`, `run-002`
- Dashboard at: http://localhost:4242 (start with: `node dist/cli.js dashboard --repo <target> --port 4242`)

## Proof Required For Everything

No claim counts without one of:
- exact file path
- exact API response
- exact run folder on disk
- screenshot
- test output
- build output

## One-Task Format

Task: [what]
Preserve: [A, B, C]
Done when: [check 1, check 2]
Proof: [file path / API response / run folder]
