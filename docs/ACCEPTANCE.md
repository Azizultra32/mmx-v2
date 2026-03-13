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

## Artifact Contract Acceptance

Each item requires proof: file path, stage output contents, or validator output.

- [x] Cathedral writes `cathedral/schematics/index.json` before Find reads it — find/index.ts reads it before dryRun branch, hard fails if missing
- [ ] Find reads only declared inputs from cathedral output, writes to `find/raw/<fid8>.json`
- [ ] Distill reads only `find/` outputs, writes to `distill/approved/<fid8>.packet.json`
- [ ] Each stage's input handles are declared before execution starts
- [ ] Each stage's output handles are declared before execution starts
- [ ] A missing required input causes CONTRACT_BREACH event (not silent skip)
- [ ] A missing required output causes CONTRACT_BREACH event (not silent skip)
- [ ] No stage reads files outside its declared input handles
- [ ] No stage writes files outside its declared output handles
- [x] Artifact provenance: JSON outputs contain run_id, stage, generated_at — markdown stubs excluded
- [ ] End-to-end dryRun: cathedral schematic → find findings → distill survivors chain proven with real file contents at each handoff point

## Three Laws
- [ ] `preflight` fails with ENGINE_EQUALS_TARGET when engine path = target path
- [ ] `preflight` fails with TARGET_DIRTY when target has uncommitted changes
- [ ] `preflight` passes on a clean git repo separate from engine

## Pipeline (dryRun mode)
- [ ] Full 8-stage dryRun completes without error
- [ ] All 164 tests pass
- [ ] TypeScript: 0 errors
