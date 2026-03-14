# MMX v2 — CURRENT STATE
Last updated: 2026-03-14

## What Works (Proven)

### Engine (~/mmx-v2)
- [x] 4-surface model: `.mmx/` workspace, `target.json`, `current.json`, `history.json`
- [x] Sequential run IDs: `run-001`, `run-002`...
- [x] Three Laws enforcement (execFile, no shell injection)
- [x] Agent SDK runner — Claude Max subscription, no API key, `cwd` + `bypassPermissions`
- [x] Full 8-stage real SDK pipeline proven end-to-end
- [x] Cathedral scans real source files, find reads cathedral, distill reads find
- [x] Distill post-processes LLM verdicts into approved packets
- [x] Demo sandbox generator with 6 buggy TS files
- [x] Dashboard target-first UI (TargetSelector + NewTargetModal)
- [x] External runner: `scripts/run-external.sh` (strips CLAUDECODE)
- [x] Dashboard spawn strips CLAUDECODE from child env
- [x] 171 tests passing, 0 TypeScript errors
- [x] Implement + FinalGuard use workspace cwd (Three Laws fix)

### Real runs proven
- run-012 on ~/mmx-sandbox: $14.46, 167 artifacts, real SQL injection patch written
- run-001 on ~/aims-v2: 10 findings, $18.89, 6 patches approved by FinalGuard
- run-002 on ~/aims-v2: 15 findings, $26.46, 6 approved / 6 needs-revision / 2 rejected

## What Is Broken / Missing

### --focus flag (NEXT BUILD TASK)
- [ ] No targeted level-2 pass on specific finding
- [ ] Build: `dist/cli.js run <target> --level 2 --focus "serverless rate limiting"`
- [ ] Decision: user chose option 3 for c3d4e5f6 (serverless rate limiter) = focused level-2

### Three Laws partial violation
- [x] Fixed in mmx-v2 engine (implement+finalguard workspace cwd)
- [ ] run-002 still wrote to aims-v2 source files (ran before fix compiled)
- [ ] aims-v2 working tree dirty with run-002 patches applied to source

### aims-v2 patch status (pending human review)
- APPLY (FinalGuard approved):
  a1b2c3d4 N+1 session queries
  b2c3d4e5 hardcoded HMAC key → randomBytes(32)
  c5d6e7f8 updatedAt $onUpdate
  c9d0e1f2 agent delete cascade
  d0e1f2a3 dashboard unbounded SELECT → COUNT
  f6a7b8c9 checkApiKey dead code regression test
- FIX TESTS THEN APPLY:
  a7b8c9d0 invalid date validation (tests use wrong channel format)
  b4c5d6e7 bridge WebSocket auth (tests have blocking issues)
  b8c9d0e1 chat CLI arg → stdin pipe (tests broken)
- HUMAN DECISION NEEDED:
  a3b4c5d6 parseInt NaN (check if Zod already handles this)
  e5f6a7b8 channelId UUID validation (cross-contaminated)
  f2a3b4c5 WSManager Redis (architecture sound, impl incomplete)
- DO NOT APPLY:
  e1f2a3b4 REJECTED — removes active requireAuth(), security regression
  c3d4e5f6 REJECTED — incomplete DB rate limiter → re-run level 2 with --focus

### Not built
- [ ] GitHub Clone (POST /api/targets/clone)
- [ ] Parallelization of Predict/Implement/FinalGuard outer loops
- [ ] Artifact explorer in dashboard
- [ ] Run history scoped to selected target in dashboard
- [ ] Cost telemetry fix (still shows dollar amounts, should be ESTIMATE)

## Unproven
- [ ] HumanGate end-to-end approve flow
- [ ] Parallelized runs
- [ ] --focus targeted runs
