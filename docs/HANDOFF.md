# MMX v2 — HANDOFF

Minimal restart context for next session or next agent.

## Read First (in order)
1. `docs/CANON.md`
2. `docs/ACCEPTANCE.md`
3. `docs/CURRENT_STATE.md`
4. `docs/TASK_LOG.md`
5. This file

## Where We Are (2026-03-14)

MMX v2 engine is fully built and proven on real targets.

**Engine:** `~/mmx-v2` — all 8 stages working, real SDK runs proven
**Last commit:** `8b3710d` — Three Laws fix (implement/finalguard workspace cwd)
**Tests:** 171 passing, 0 TS errors
**GitHub:** github.com/Azizultra32/mmx-v2

**Target analyzed:** `~/aims-v2` (github.com/Azizultra32/aims-v2)
- run-001: 10 findings, $18.89 — patches committed to aims-v2
- run-002: 15 findings, $26.46 — patches in working tree, NOT committed
  - aims-v2 working tree is currently DIRTY
  - See CURRENT_STATE.md for which patches to apply/skip/reject

## Immediate Next Task

**Build `--focus` flag in mmx-v2.**

Task:
Add `--focus <topic>` CLI flag to `dist/cli.js run` command.
When set, seed the find stage prompt with the focus topic so the agent
investigates that area deeply instead of general scanning.

Files to modify:
- `src/cli.ts` — add --focus option to parseArgs
- `src/commands/run.ts` — pass focusTopic to runFind
- `src/stages/find/index.ts` — inject focusTopic into real-mode payload

Preserve:
- All existing behavior when --focus is not set
- 171 tests passing
- 0 TS errors

Done when:
- `node dist/cli.js run ~/aims-v2 --level 2 --focus "serverless rate limiting architecture"` executes
- Find stage prompt contains the focus topic
- Proof: run output + find/raw artifacts show rate-limiting-focused findings

Then:
Run level 2 focused pass on `~/aims-v2` targeting the serverless rate limiter gap.

## Critical Context

- Engine: `~/mmx-v2/` — never use as target
- Workspace: `<target>/.mmx/` (was .metamatrix/, renamed)
- Run IDs: sequential `run-001`, `run-002`...
- SDK: Agent SDK / Claude Max subscription — NOT real API billing
- CLAUDECODE: must be unset for SDK runs: `env -u CLAUDECODE node dist/cli.js run ...`
- Dashboard: `node dist/cli.js dashboard --repo <target> --port 4242`
- Three Laws: target must have clean git status before each run

## aims-v2 Patch Situation

Working tree has run-002 patches applied directly to source (Three Laws violation,
now fixed in engine but run-002 already ran with old code).

DO NOT apply:
- e1f2a3b4 (removes active requireAuth — security regression)
- c3d4e5f6 (incomplete DB rate limiter — use --focus level 2 instead)

APPLY when clean:
- a1b2c3d4, b2c3d4e5, c5d6e7f8, c9d0e1f2, d0e1f2a3, f6a7b8c9 (FinalGuard approved)

## Proof Standard

No claim counts without: exact file path, API response, run folder, screenshot, test output, or build output.

## One-Task Format

Task: [what]
Preserve: [A, B, C]
Done when: [check 1, check 2]
Proof: [file / API / run folder]
