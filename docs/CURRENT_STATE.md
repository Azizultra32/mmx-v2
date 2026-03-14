# MMX v2 — CURRENT STATE
Last updated: 2026-03-14

## What Works (Proven)

### Engine (~/mmx-v2) — commit 4f4f91f
- [x] 4-surface model, .mmx workspace, sequential run IDs
- [x] Three Laws enforcement
- [x] Agent SDK runner — Claude Max, no API key
- [x] Full 8-stage real SDK pipeline proven
- [x] Artifact chain: cathedral→find→distill→predict→propose→implement→finalguard
- [x] Parallel implement + finalguard (Promise.all) — 6x wall-clock improvement
- [x] Demo sandbox + target-first dashboard
- [x] --focus flag for targeted level-2 runs
- [x] 171 tests passing, 0 TS errors
- [x] SDK cli.js path fixed (resolves from engine dir, not cwd)

### aims-v2 (~/aims-v2, branch: mmx-level2-rate-limiting)
- [x] 6 FinalGuard-approved patches from run-002 committed
- [x] Upstash Redis rate limiter implemented (src/lib/rate-limit.ts)
- [x] @upstash/ratelimit + @upstash/redis installed
- [x] All 6 rate-limit call sites updated to async/await

## What Is Missing

### aims-v2
- [ ] Upstash env vars not set in Vercel: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
- [ ] Branch mmx-level2-rate-limiting not merged to main
- [ ] Other 5 findings from run-004 not patched (unguarded endpoints, composite key, test docs)

### Engine
- [ ] GitHub Clone (POST /api/targets/clone)
- [ ] Artifact explorer in dashboard
- [ ] Run history scoped to selected target
- [ ] Cost telemetry fix (show ESTIMATE not dollar amounts)

## Unproven
- [ ] Full pipeline run-005 with SDK cli.js fix — not yet run
- [ ] FinalGuard with parallel execution — never completed successfully
