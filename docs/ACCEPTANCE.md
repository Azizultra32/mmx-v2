# MMX v2 — ACCEPTANCE CRITERIA

What must be true for the product to count as working.
Each item requires proof: file path, API response, run folder, screenshot, or test output.

## Target Management
- [x] `POST /api/targets/scaffold` creates `~/mmx-sandbox/` with buggy TS files + git init + `.mmx/target.json` — proven Task 4
- [x] `GET /api/targets` returns list of registered targets — proven Task 4: `{"targets":[{"target_id":"target-5d0d92f4",...}]}`
- [x] Dashboard shows target selector (not just a path input) — proven Task 3, screenshot confirmed
- [ ] Selecting target shows its run history (scoped to that target)

## Run Lifecycle
- [x] `POST /api/run` with targetPath creates `<target>/.mmx/runs/run-001/` on disk — proven Task 5b
- [x] Second run creates `run-002/`, preserves `run-001/` — proven Task 6
- [x] `<target>/.mmx/current.json` updated after each run — proven Task 6: `latest_run_id: "run-002"`
- [x] `<target>/.mmx/history.json` contains all run summaries — proven Task 6: 2 entries
- [ ] Dashboard run history shows all prior runs for selected target (history.json-backed, target-scoped)

## Dashboard UX
- [x] New Target button opens modal with Demo Sandbox + GitHub Clone options — proven Task 3
- [ ] Clicking Demo Sandbox creates sandbox and auto-selects it — modal exists, auto-select not verified end-to-end
- [ ] Stage dots animate correctly during a live run
- [ ] HumanGate panel appears when run reaches HUMANGATE
- [ ] APPROVE button writes decision and run continues
- [ ] Failure panel shows error when run fails
- [ ] GitHub Clone mode (POST /api/targets/clone) — not yet built

## Cost Telemetry
- [ ] No fake dollar amounts shown as real billing — OPEN: run output still logs `cost: $0.0000`
- [ ] Model name shown per run (claude-opus-4-6)
- [ ] Token counts shown if available from SDK
- [ ] Any USD estimate labeled "ESTIMATE (not billed)"

## Artifact Contract Acceptance

Each item requires proof: file path, stage output contents, or validator output.

- [x] Cathedral writes `cathedral/schematics/index.json` before Find reads it — find/index.ts reads it unconditionally before dryRun branch, INPUT_VALIDATION_FAILED if missing (find/index.ts:40)
- [x] Find reads cathedral output, derives deterministic fid8s, writes `find/raw/<fid8>.json` with `cathedral_run_id` provenance — proven run-006
- [x] Distill reads `find/convergence/convergence-matrix.json` unconditionally, uses its fid8 list to write `distill/approved/<fid8>.packet.json` — proven run-006: matrix fid8s [e4ac4b55, 2562f39a] == distill approved fid8s
- [ ] Each stage's input handles are declared before execution starts
- [ ] Each stage's output handles are declared before execution starts
- [ ] A missing required input causes CONTRACT_BREACH event (not silent skip)
- [ ] A missing required output causes CONTRACT_BREACH event (not silent skip)
- [ ] No stage reads files outside its declared input handles
- [ ] No stage writes files outside its declared output handles
- [x] Artifact provenance: JSON outputs contain run_id, stage, generated_at — proven run-006 (markdown stubs excluded)
- [x] End-to-end dryRun cathedral→find→distill chain proven — run-006: cathedral source_refs=[6 real files], find.cathedral_run_id=run-006, distill fid8s match find matrix exactly

## Three Laws
- [ ] `preflight` fails with ENGINE_EQUALS_TARGET when engine path = target path
- [ ] `preflight` fails with TARGET_DIRTY when target has uncommitted changes
- [x] `preflight` passes on a clean git repo separate from engine — proven Task 5b

## Pipeline (dryRun mode)
- [x] Full 8-stage dryRun completes without error — proven run-006
- [x] All tests pass — 171 passing (31 files)
- [x] TypeScript: 0 errors

## Real SDK Run (not yet proven)
- [ ] Real (non-dryRun) pipeline run against sandbox completes at least cathedral stage
- [ ] Agent SDK authenticates via Claude Max subscription (no API key)
- [ ] Real findings written to find/raw/ from actual LLM analysis of sandbox files
