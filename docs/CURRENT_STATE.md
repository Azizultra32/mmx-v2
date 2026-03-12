# MMX v2 — CURRENT STATE
Last updated: 2026-03-12

## What Works

### Engine
- [x] Engine in `~/mmx-v2/` — correct separation
- [x] Three Laws enforcement (`src/core/three-laws.ts`) — execFile, no shell injection
- [x] Agent SDK runner (`src/runner/sdk-runner.ts`) — Max subscription, no apiKey
- [x] Daemon (hang detector, retry, heartbeat)
- [x] Full 8-stage pipeline in dryRun mode
- [x] 164 tests passing, 0 TypeScript errors
- [x] Dashboard HTTP server with SSE events
- [x] React dashboard UI (dark theme, stage dots, LaunchBar, HumanGate panel)

### Workspace
- [x] Workspace written to `<target>/.mmx/runs/<runId>/` ✓
- [x] `Paths` class provides all artifact paths per stage (`src/core/paths.ts`)
- [x] `RunRegistry` writes run state to `runs/<runId>/registry/run.json` (`src/state/machine.ts`)
- [x] `EventSpine` appends to `runs/<runId>/events/activity.jsonl`

### Dashboard
- [x] POST /api/run spawns a CLI run (but reads body only partially)
- [x] GET /api/runs returns runs from `.mmx/runs/`
- [x] GET /api/events SSE stream from activity.jsonl
- [x] POST /api/run/:id/approve writes human-approval.json

## What Is Broken / Missing

### 4-Surface Model Not Complete
- [x] Workspace dir is `.mmx/` ✓
- [x] `target.json`, `current.json`, `history.json` added ✓
- [x] Run IDs are `run-001`, `run-002` (sequential) ✓

### Target Management Missing
- [ ] No target registry
- [ ] No Demo Sandbox generator (`POST /api/targets/scaffold` does not exist)
- [ ] No GitHub Clone functionality
- [ ] Dashboard has a raw path input instead of target selector
- [ ] No `GET /api/targets` endpoint

### Dashboard UX Incomplete
- [ ] No New Target flow (no modal, no Demo Sandbox / GitHub Clone options)
- [ ] No artifact explorer (shows events only, not stage output content)
- [ ] No run comparison
- [ ] Target-first UX missing — dashboard is run-centric

### Cost Telemetry Incorrect
- [ ] `src/commands/run.ts:109` logs `cost: $${result.costUsd.toFixed(4)}` as if real API billing
- [ ] `src/state/machine.ts` stores `total_cost_usd` as a real number in registry
- [ ] Running via Agent SDK/Max subscription — no actual per-run USD charge
- [ ] Should show model + token counts, label USD as ESTIMATE

## What Is Unproven
- [ ] Real SDK run (not dryRun) — untested against actual target
- [ ] HumanGate approval flow end-to-end
- [ ] Dashboard with live run in progress
