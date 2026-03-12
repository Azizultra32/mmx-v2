# MMX v2 — ACCEPTANCE CRITERIA

What must be true for the product to count as working.
Each item requires proof: file path, API response, run folder, screenshot, or test output.

## Target Management
- [ ] `POST /api/targets/scaffold` creates `~/mmx-sandbox/` with buggy TS files + git init + `.mmx/target.json`
- [ ] `GET /api/targets` returns list of registered targets
- [ ] Dashboard shows target selector (not just a path input)
- [ ] Selecting target shows its run history

## Run Lifecycle
- [ ] `POST /api/run` with targetPath creates `<target>/.mmx/runs/run-001/` on disk
- [ ] Second run creates `run-002/`, preserves `run-001/`
- [ ] `<target>/.mmx/current.json` updated after each run
- [ ] `<target>/.mmx/history.json` contains all run summaries
- [ ] Dashboard run history shows all prior runs for selected target

## Dashboard UX
- [ ] New Target button opens modal with Demo Sandbox + GitHub Clone options
- [ ] Clicking Demo Sandbox creates sandbox and auto-selects it
- [ ] Stage dots animate correctly during a live run
- [ ] HumanGate panel appears when run reaches HUMANGATE
- [ ] APPROVE button writes decision and run continues
- [ ] Failure panel shows error when run fails

## Cost Telemetry
- [ ] No fake dollar amounts shown as real billing
- [ ] Model name shown per run (claude-opus-4-6)
- [ ] Token counts shown if available from SDK
- [ ] Any USD estimate labeled "ESTIMATE (not billed)"

## Three Laws
- [ ] `preflight` fails with ENGINE_EQUALS_TARGET when engine path = target path
- [ ] `preflight` fails with TARGET_DIRTY when target has uncommitted changes
- [ ] `preflight` passes on a clean git repo separate from engine

## Pipeline (dryRun mode)
- [ ] Full 8-stage dryRun completes without error
- [ ] All 164 tests pass
- [ ] TypeScript: 0 errors
