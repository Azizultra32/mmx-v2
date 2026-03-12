# MMX v2 — CANON

Non-negotiable truths. No discussion. No history.

## The 4 Surfaces

1. **ENGINE** — `~/mmx-v2/` — read-only product repo. Never analyzes or patches itself.
2. **TARGET** — the repo being analyzed. Separate from engine. May be demo sandbox, GitHub clone, or local repo.
3. **WORKSPACE** — `<target>/.mmx/` — all MMX state for that target. Target-scoped. Not engine-scoped.
4. **RUN** — one execution instance. Immutable history once written. Many runs per target.

## Non-Negotiables

1. Engine repo is read-only and never a target.
2. Target repo is separate from engine.
3. Workspace is target-scoped: `<target>/.mmx/`
4. Artifacts and history live under the target workspace, not the engine.
5. New run = new run id (`run-001`, `run-002`, ...).
6. Resume = same run id.
7. Prior runs are preserved. Clear current does NOT delete history.
8. Claude Max / Agent SDK only. No ANTHROPIC_API_KEY.
9. Cost telemetry ≠ billable API spend. Show model + token counts. Label estimates as ESTIMATE.
10. Dashboard is target-first, run-second.
11. Never claim launch works unless a real run folder exists on disk.
12. Demo Sandbox first, GitHub Clone second. One New Target flow, two modes.

## Workspace Layout

```
<target>/
  .mmx/
    target.json      ← target identity + source
    current.json     ← active_run_id, selected_run_id, latest_run_id
    history.json     ← summary list of all runs
    runs/
      run-001/
        state.json
        events.jsonl
        registry/
        artifacts/
          cathedral/  find/  distill/  predict/
          propose/  implement/  finalguard/  humangate/
        logs/
      run-002/
      run-003/
```

## Run Semantics

- **NEW RUN** — new run folder, new id, preserves all prior runs
- **RESUME** — continues same run id, same folder
- **RE-RUN** — new run id against same target
- **CLEAR CURRENT** — clears UI pointer only, never deletes history
- **ARCHIVE/DELETE** — explicit action only, never implicit

## Cost Telemetry Truth

Running via Agent SDK / Claude Max subscription:
- No per-call USD billing
- Show: model used, token counts if available, stage that consumed most
- Label any USD estimate as: `ESTIMATE (not billed)`
- Never show fake dollar amounts as real billing
