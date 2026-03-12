# MMX v2 — TASK LOG

One entry per completed task. Format: task | files | proof | next.

---

## 2026-03-12

### Task 1: Rename .metamatrix → .mmx, add target/current/history, sequential run IDs
Files: src/core/paths.ts, src/state/machine.ts, src/commands/run.ts, src/core/three-laws.ts, src/core/contracts.ts, src/commands/dashboard.ts, src/core/paths.test.ts, src/core/three-laws.test.ts
Proof: 167 tests pass, 0 TS errors, grep -r metamatrix src/ = empty
Next: Demo Sandbox generator (src/scaffold/demo-sandbox.ts)

### Task 2: Demo Sandbox generator
Files: src/scaffold/demo-sandbox.ts, src/scaffold/demo-sandbox.test.ts, src/commands/dashboard.ts
Proof: tests pass (168 total), ls ~/mmx-sandbox/.mmx/target.json exists after curl -X POST /api/targets/scaffold
Next: Dashboard New Target UI (TargetSelector + NewTargetModal components)

### Dashboard CSS + UI overhaul
Files: `dashboard/src/App.css`, `StageSpine.tsx`, `LaunchBar.tsx`, `EventFeed.tsx`, `RunHistory.tsx`, `CostBreakdown.tsx`, `src/commands/dashboard.ts`
Proof: 164 tests pass, `npm run build` zero errors, screenshot shows dark terminal UI with stage dots + LaunchBar
Next: 4-surface model refactor (workspace rename, target.json, current.json, history.json)

### MMX v2 full build (Tasks 1-22 + dashboard)
Files: All of `src/` and `dashboard/`
Proof: `git log --oneline` shows 30 commits, 164 tests, 0 TS errors
Next: 4-surface model, target management, demo sandbox, artifact explorer
