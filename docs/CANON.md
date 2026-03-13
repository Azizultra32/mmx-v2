# MMX v2 — CANON

Non-negotiable truths. No discussion. No history. No "maybe."
Source: MMX.txt (canonical spec)

## Non-Negotiables

1. Engine repo is never a target.
2. Target repo is always separate from engine.
3. Workspace is target-scoped: `<target>/.mmx/`
4. Artifacts, history, approvals, events, and reports live under the target workspace.
5. New run = new run id.
6. Resume = same run id.
7. Re-run = new run id against same target.
8. Prior runs are preserved by default.
9. Clear current does NOT delete history.
10. Dashboard is target-first, run-second.
11. Claude Max / Agent SDK only. No Anthropic API key.
12. Cost truth ≠ billable API pricing.
13. Never claim launch success unless a real run folder and state file exist.
14. Never claim "done" without proof.
15. Agent SDK CANNOT run inside an active Claude Code session (CLAUDECODE env var blocks nested spawns). The production runtime path is: start dashboard from a plain terminal → dashboard spawns runs with CLAUDECODE stripped from child env. For direct CLI runs: use `scripts/run-external.sh` from a plain terminal outside Claude Code.

## The 4 Surfaces

1. **ENGINE** — `~/mmx-v2/` — read-only. Never analyzes or patches itself.
2. **TARGET** — repo under analysis. Separate from engine. Demo sandbox, GitHub clone, or local.
3. **WORKSPACE** — `<target>/.mmx/` — all MMX state. Target-scoped.
4. **RUNS** — one execution instance per run id. Immutable. Many per target.

## Required Filesystem Model

```
engine/
  mmx-v2/
    src/  dashboard/  prompts/  package.json

targets/
  some-target/
    .git/
    src/
    .mmx/
      target.json
      current.json
      history.json
      runs/
        run-001/
          state.json
          events.jsonl
          report.json
          approvals/
          artifacts/
            cathedral/  find/  distill/  predict/
            propose/  implement/  finalguard/  humangate/
          logs/
          cache/
        run-002/
        run-003/
```

## Target-Scoped State (Required)

`target/.mmx/target.json`
- target_id, display_name, source_type (demo|github|local)
- source_url or local_path, created_at, engine_version

`target/.mmx/current.json`
- selected_run_id, active_run_id, latest_run_id, dashboard_target_state

`target/.mmx/history.json`
- summarized run list for fast dashboard loading

`target/.mmx/runs/<run-id>/state.json`
- run_id, target_id, current stage, status
- created_at, updated_at, completed_at, failed_at, failure_reason
- total_cost, model/runtime metadata

## Run Semantics

- **NEW RUN** — new run id, new folder, preserves all prior runs
- **RESUME** — same run id, same folder
- **RE-RUN** — new run id against same target
- **CLEAR CURRENT** — clears UI pointer only, never deletes history
- **ARCHIVE/PRUNE** — explicit action only, never implicit

## Cost / Usage / Model Truth

Running via Agent SDK / Claude Max subscription:
- Do NOT show fake API-billed dollar amounts as real billing
- Show: model used, token/usage counts if available, stage distribution
- USD estimates must be labeled: `ESTIMATE (not billed)`
- Dashboard panel: MODEL / USAGE / RESOURCE TRUTH

## Pipeline Stages

CATHEDRAL → FIND → DISTILL → PREDICT → PROPOSE → IMPLEMENT → FINALGUARD → HUMANGATE

Each stage:
- has predeclared typed inputs
- has predeclared typed outputs
- owns its output directory under `target/.mmx/runs/<run-id>/`
- fails closed
- is resumable appropriately

## New Target Flow

One coherent flow, two modes:
1. **Demo Sandbox** first — deterministic proof path
2. **GitHub Clone** second — real-world usage

## Proof Standard

No claim counts without one of:
- exact file path
- exact API response
- exact run folder on disk
- screenshot
- test output
- build output

## Operating Model

- Use only CANON, ACCEPTANCE, CURRENT_STATE, TASK_LOG, HANDOFF
- One task at a time
- No giant transcripts
- No planning loops
- Prove every claim
