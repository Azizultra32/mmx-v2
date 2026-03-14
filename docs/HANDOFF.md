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
**Last commit:** `4f4f91f` — SDK cli.js path fix
**Tests:** 171 passing, 0 TS errors
**GitHub:** github.com/Azizultra32/mmx-v2

**Target analyzed:** `~/aims-v2` (github.com/Azizultra32/aims-v2)
- run-001: 10 findings, $18.89 — patches committed to aims-v2
- run-002: 15 findings, $26.46 — 6 patches committed to branch mmx-level2-rate-limiting
- rate-limit.ts: Upstash Redis rate limiter implemented, awaiting Vercel env vars + merge

## Immediate Next Task

**Verify full pipeline with run-005.**

Command:
```
env -u CLAUDECODE node dist/cli.js run ~/aims-v2 --level 2 --focus "serverless rate limiting"
```

Must complete all 8 stages including FinalGuard (parallel). Previous runs failed at FinalGuard due to SDK cli.js resolution bug — now fixed in 4f4f91f.

**After run-005 passes:**
1. Review FinalGuard verdicts on rate-limit patches
2. If approved: merge mmx-level2-rate-limiting → main in aims-v2
3. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in Vercel
4. Deploy

## Critical Context
- Engine: ~/mmx-v2 (main, commit 4f4f91f)
- Target: ~/aims-v2 (branch: mmx-level2-rate-limiting)
- All runs: env -u CLAUDECODE node /Users/ali/mmx-v2/dist/cli.js run ...
- Three Laws: target must have clean git status before each run

## Proof Standard

No claim counts without: exact file path, API response, run folder, screenshot, test output, or build output.

## One-Task Format

Task: [what]
Preserve: [A, B, C]
Done when: [check 1, check 2]
Proof: [file / API / run folder]
