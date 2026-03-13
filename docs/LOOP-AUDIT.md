# MMX v2 — Loop Implementation Audit
Date: 2026-03-12
Source: Monitor session (adversary review of runtime-vs-contract drift)

## Problem Statement

The loop-capable path model exists. The loop logic is only partially implemented.
This document makes a binding decision for each stage. No ghost structure.

---

## FIND — Multi-Round Convergence

### Current state
One SDK agent fires. It produces raw + merged + convergence per fid8 from a single pass.
In dryRun: same stub data is written to raw/, merged/, and convergence/ — they are identical.
No actual convergence voting happens anywhere.

### Decision: CANONICAL — wire it

The three-tier structure (raw → merged → convergence) is not cosmetic.
It encodes a specific model: multiple find agents produce raw findings, deduplication produces merged, convergence voting produces the convergence file.

**Required implementation:**
1. Dispatch N find agents in parallel (N = level parameter, minimum 3)
2. Each agent writes to `find/raw/{fid8}.json`
3. A deduplication pass merges similar findings → `find/merged/{fid8}.json`
4. A convergence vote across agents produces `find/convergence/{fid8}.json` with `vote_count`
5. Matrix aggregates all converged findings

In dryRun: differentiate the three tiers — raw has raw output, merged has dedup applied, convergence has vote_count ≥ 2. Do not write identical stubs to all three.

**Do not simplify the path model. Implement the loop.**

---

## IMPLEMENT — Cycle Retry Loop

### Current state
```typescript
const cycle = 1; // hardcoded — never increments
```
`writeIFR()` function exists. `paths.implement.ifr(fid8, cycle)` exists.
On failure: writes IFR cycle 1, returns `ok: false`. No retry.
The multi-cycle path structure (`{fid8}.1.diff`, `{fid8}.2.diff`) was never used.

### Decision: CANONICAL — wire it now

IFR exists specifically to enable retry. The cycle parameter in paths is not decorative.

**Required implementation:**
```
maxCycles = 3
for cycle in 1..maxCycles:
  attempt patch
  if ok: write approved, break
  if failed:
    write IFR(fid8, cycle, reason)
    if cycle == maxCycles: return ok: false with all IFR paths
    continue to cycle+1
```

**Artifacts per finding per failed cycle:**
- `implement/patches/{fid8}.{cycle}.diff`
- `implement/tests/{fid8}.{cycle}.json`
- `implement/facts/{fid8}.{cycle}.json`
- `implement/ifr/{fid8}.{cycle}.json` ← currently never written on disk

**Do not keep the hardcoded `cycle = 1`. Wire the loop.**

---

## PREDICT — Adjudication Beyond Parallel Subroles

### Current state
4 subroles fire in parallel (DA, FSM, G5, SimVerify).
`approved` packet is written immediately after all 4 complete.
No agent reads all 4 outputs and makes an adjudication decision.
`predict/stenography/` path exists in paths.ts but nothing writes to it and it is not in contracts.ts.

### Decision: DEFERRED — explicitly marked, not ghost

The 4-parallel model is canonical. A separate adjudication agent pass is NOT canonical at this time.

**Actions required:**
1. Remove `stenography` from `paths.ts` — it is never written, creates ghost path expectation
2. Remove `predict.stenography` from any contracts reference if present
3. Add comment in predict/index.ts:
   ```typescript
   // NOTE: Adjudication deferred. DA role serves as implicit aggregator.
   // Explicit adjudication agent marked DEFERRED in LOOP-AUDIT.md (2026-03-12).
   ```
4. The `predict.approved` packet must include a `subroles_completed` array so downstream stages know all 4 fired

**Do not add a 5th agent pass. Mark the deferral and clean up the ghost path.**

---

## Contract Drift Fix Required

Three undeclared artifacts are being written to disk:
- `implement/facts/{fid8}.{cycle}.json` — NOT in ARTIFACT_CONTRACTS
- `implement/tests/{fid8}.{cycle}.json` — NOT in ARTIFACT_CONTRACTS
- `finalguard/notes/{fid8}.md` — NOT in ARTIFACT_CONTRACTS

One declared artifact is never written:
- `cathedral/briefings/{batch_id}.json` — IN ARTIFACT_CONTRACTS, never appears on disk

**Required:**
1. Add `implement.facts`, `implement.tests`, `finalguard.notes` to ARTIFACT_CONTRACTS with correct consumers
2. Either implement `cathedral.briefings` or remove it from ARTIFACT_CONTRACTS
3. No artifact on disk that is not in contracts. No contract that has no disk presence.

---

## Summary Table

| Stage | Loop Type | Decision | Action |
|-------|-----------|----------|--------|
| FIND | Multi-agent convergence rounds | CANONICAL | Wire multi-agent dispatch + differentiated tiers |
| IMPLEMENT | Cycle retry on patch failure | CANONICAL | Wire loop with maxCycles=3 |
| PREDICT | Adjudication agent after 4 subroles | DEFERRED | Remove ghost stenography path, add comment |
| CATHEDRAL | Multi-batch briefings | DECISION NEEDED | Either implement or remove from contracts |

---

## How to Work

One task per stage. Start with IMPLEMENT (cycle loop) — it is self-contained and highest impact.
Then FIND (multi-agent dispatch) — requires runner changes.
Then contract drift cleanup.
Each task: prove with real run artifacts showing multiple cycles / multiple agent outputs.
