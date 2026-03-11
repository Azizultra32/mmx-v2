# MMX v2 Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild mmx-v2 from scratch using the MMX 2.txt canonical spec — a contract-driven, stateful, multi-agent orchestration engine running entirely on Claude Code Max subscription (zero API cost).

**Architecture:** Five-phase sane build pathway: (1) Canon types/contracts, (2) Enforcement layer, (3) Stage runtime one-by-one, (4) Dashboard truth layer, (5) Fork optimization. Every agent call uses `@anthropic-ai/claude-agent-sdk` with `model: "claude-opus-4-6"` and NO apiKey — Max subscription auth only.

**Tech Stack:** TypeScript ESM, Node.js, `@anthropic-ai/claude-agent-sdk`, Vitest, React + Vite (dashboard)

**Spec source:** `/Users/ali/Downloads/MMX 2.txt` — read it for any detail not in this plan.

**CRITICAL RULES:**
- Never use `ANTHROPIC_API_KEY`
- Never pass `apiKey` to the Agent SDK
- Always authenticate through Claude Code Max subscription
- For git/shell: always `execFile` with argument arrays, never `exec` with shell strings
- All workspace writes go to `<target>/.metamatrix/` only

---

## Phase 1 — Canon (Types, Contracts, Paths)

### Task 1: Core types — RunCard, StageId, StateValue, ArtifactIOItem

**Files:**
- Create: `~/mmx-v2/src/core/types.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/core/types.test.ts
import { describe, it, expect } from 'vitest';
import type { RunCard, ArtifactIOItem, AcceptanceCheck, ThreadBlock } from './types.js';

describe('RunCard type', () => {
  it('has all 13 required fields', () => {
    const card: RunCard = {
      contract_type: 'fresh_agent',
      run_id: 'mmx-abc12345',
      agent_id: 'agent-find-001',
      stage: 'find',
      role: 'find-agent',
      thread_mode: 'fresh',
      model: 'claude-opus-4-6',
      thread: { parent_thread_id: null, fork_root_thread_id: null, fork_path: null, fork_depth: null, fork_reason: null, max_turns: 20 },
      inputs: [],
      outputs: [],
      rules: ['read only declared inputs'],
      acceptance_checks: [],
      next_consumer: { role: 'distill-challenger', stage: 'distill' },
    };
    expect(card.contract_type).toBe('fresh_agent');
    expect(card.run_id).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**
```bash
cd ~/mmx-v2 && npm test src/core/types.test.ts
```
Expected: FAIL — types.ts does not exist

**Step 3: Create types.ts**

```typescript
// ~/mmx-v2/src/core/types.ts

export type StageId =
  | 'cathedral' | 'find' | 'distill' | 'predict'
  | 'propose' | 'implement' | 'finalguard' | 'humangate';

export type ContractType = 'fresh_agent' | 'forked_agent';
export type ThreadMode = 'fresh' | 'forked';

export type UnitState =
  | 'pending' | 'validating_inputs' | 'ready' | 'running'
  | 'wrote_outputs' | 'validating_outputs' | 'complete'
  | 'blocked' | 'contract_breach' | 'failed' | 'parked' | 'awaiting_human';

export interface ArtifactIOItem {
  handle: string;
  path: string;
  required: boolean;
  format: 'json' | 'markdown' | 'diff' | 'text' | 'html' | 'jsonl';
  schema_ref: string | null;
  owner_role: string | null;
}

export interface AcceptanceCheck {
  description: string;
  required: boolean;
}

export interface ThreadBlock {
  parent_thread_id: string | null;
  fork_root_thread_id: string | null;
  fork_path: string | null;
  fork_depth: number | null;
  fork_reason: string | null;
  max_turns: number | null;
}

export interface NextConsumer {
  role: string | null;
  stage: string | null;
}

export interface RunCard {
  contract_type: ContractType;
  run_id: string;
  agent_id: string;
  stage: StageId;
  role: string;
  thread_mode: ThreadMode;
  model: string;
  thread: ThreadBlock;
  inputs: ArtifactIOItem[];
  outputs: ArtifactIOItem[];
  rules: string[];
  acceptance_checks: AcceptanceCheck[];
  next_consumer: NextConsumer;
}

export interface RunnerResult {
  ok: boolean;
  output: string;
  completed: boolean;
  costUsd: number;
  error?: string;
}

export interface StageResult {
  ok: boolean;
  runId: string;
  stage: StageId;
  outputPaths: Record<string, string>;
  costUsd: number;
  error?: string;
}

// Distill verdict
export type DistillVerdict = 'approve' | 'reject' | 'needs_revision';

// Human gate decision
export type HumanDecision = 'APPROVE' | 'REJECT' | 'SEND_BACK' | 'PARK';
```

**Step 4: Run test**
```bash
cd ~/mmx-v2 && npm test src/core/types.test.ts
```
Expected: PASS

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/core/types.ts src/core/types.test.ts && git commit -m "feat(canon): core types — RunCard 13 fields, UnitState, ArtifactIOItem"
```

---

### Task 2: Artifact paths — all stages, all patterns

**Files:**
- Create: `~/mmx-v2/src/core/paths.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/core/paths.test.ts
import { describe, it, expect } from 'vitest';
import { Paths } from './paths.js';

describe('Paths', () => {
  const p = new Paths('/target', 'run-abc1');

  it('cathedral paths', () => {
    expect(p.cathedral.brief).toBe('/target/.metamatrix/runs/run-abc1/cathedral/brief.md');
    expect(p.cathedral.schematics).toBe('/target/.metamatrix/runs/run-abc1/cathedral/schematics/index.json');
    expect(p.cathedral.briefing('b01')).toBe('/target/.metamatrix/runs/run-abc1/cathedral/briefings/b01.json');
  });

  it('find paths', () => {
    expect(p.find.raw('ab12cd34')).toBe('/target/.metamatrix/runs/run-abc1/find/raw/ab12cd34.json');
    expect(p.find.convergenceMatrix).toBe('/target/.metamatrix/runs/run-abc1/find/convergence/convergence-matrix.json');
  });

  it('distill paths', () => {
    expect(p.distill.verdict('ab12cd34')).toBe('/target/.metamatrix/runs/run-abc1/distill/verdicts/ab12cd34.json');
    expect(p.distill.approved('ab12cd34')).toBe('/target/.metamatrix/runs/run-abc1/distill/approved/ab12cd34.packet.json');
  });

  it('event spine path', () => {
    expect(p.events.activity).toBe('/target/.metamatrix/runs/run-abc1/events/activity.jsonl');
  });

  it('registry paths', () => {
    expect(p.registry.run).toBe('/target/.metamatrix/runs/run-abc1/registry/run.json');
    expect(p.registry.unit('agent-1')).toBe('/target/.metamatrix/runs/run-abc1/registry/units/agent-1.json');
  });
});
```

**Step 2: Run to verify fail**
```bash
cd ~/mmx-v2 && npm test src/core/paths.test.ts
```

**Step 3: Implement paths.ts**

```typescript
// ~/mmx-v2/src/core/paths.ts
import path from 'path';

export class Paths {
  private base: string;

  constructor(targetPath: string, runId: string) {
    this.base = path.join(targetPath, '.metamatrix', 'runs', runId);
  }

  get cathedral() {
    const b = path.join(this.base, 'cathedral');
    return {
      brief: path.join(b, 'brief.md'),
      schematics: path.join(b, 'schematics', 'index.json'),
      briefing: (batchId: string) => path.join(b, 'briefings', `${batchId}.json`),
    };
  }

  get find() {
    const b = path.join(this.base, 'find');
    return {
      raw: (fid8: string) => path.join(b, 'raw', `${fid8}.json`),
      merged: (fid8: string) => path.join(b, 'merged', `${fid8}.json`),
      convergence: (fid8: string) => path.join(b, 'convergence', `${fid8}.json`),
      convergenceMatrix: path.join(b, 'convergence', 'convergence-matrix.json'),
    };
  }

  get distill() {
    const b = path.join(this.base, 'distill');
    return {
      verdict: (fid8: string) => path.join(b, 'verdicts', `${fid8}.json`),
      challenge: (fid8: string) => path.join(b, 'challenges', `${fid8}.md`),
      approved: (fid8: string) => path.join(b, 'approved', `${fid8}.packet.json`),
    };
  }

  get predict() {
    const b = path.join(this.base, 'predict');
    return {
      da: (fid8: string) => path.join(b, 'da', `${fid8}.json`),
      fsm: (fid8: string) => path.join(b, 'fsm', `${fid8}.json`),
      g5: (fid8: string) => path.join(b, 'g5', `${fid8}.json`),
      simverify: (fid8: string) => path.join(b, 'simverify', `${fid8}.json`),
      stenography: (fid8: string, subrole: string) => path.join(b, 'stenography', `${fid8}-${subrole}.md`),
      approved: (fid8: string) => path.join(b, 'approved', `${fid8}.packet.json`),
    };
  }

  get propose() {
    const b = path.join(this.base, 'propose');
    return {
      proposal: (fid8: string, branch: string) => path.join(b, 'proposals', `${fid8}.${branch}.json`),
      stenography: (fid8: string, branch: string) => path.join(b, 'stenography', `${fid8}-${branch}.md`),
      scrutiny: (fid8: string, branch: string, role: string) => path.join(b, 'scrutiny', `${fid8}.${branch}.${role}.json`),
      approved: (fid8: string, branch: string) => path.join(b, 'approved', `${fid8}.${branch}.packet.json`),
    };
  }

  get implement() {
    const b = path.join(this.base, 'implement');
    return {
      patch: (fid8: string, cycle: number) => path.join(b, 'patches', `${fid8}.${cycle}.diff`),
      tests: (fid8: string, cycle: number) => path.join(b, 'tests', `${fid8}.${cycle}.json`),
      facts: (fid8: string, cycle: number) => path.join(b, 'facts', `${fid8}.${cycle}.json`),
      ifr: (fid8: string, cycle: number) => path.join(b, 'ifr', `${fid8}.${cycle}.json`),
      approved: (fid8: string) => path.join(b, 'approved', `${fid8}.packet.json`),
    };
  }

  get finalguard() {
    const b = path.join(this.base, 'finalguard');
    return {
      verdict: (fid8: string) => path.join(b, 'verdicts', `${fid8}.json`),
      notes: (fid8: string) => path.join(b, 'notes', `${fid8}.md`),
      receipt: (fid8: string) => path.join(b, 'receipt', `${fid8}.html`),
    };
  }

  get humangate() {
    const b = path.join(this.base, 'human');
    return {
      packet: (fid8: string) => path.join(b, 'packets', `${fid8}.packet.json`),
      decision: (fid8: string) => path.join(b, 'decisions', `${fid8}.json`),
    };
  }

  get events() {
    return {
      activity: path.join(this.base, 'events', 'activity.jsonl'),
    };
  }

  get registry() {
    const b = path.join(this.base, 'registry');
    return {
      run: path.join(b, 'run.json'),
      unit: (agentId: string) => path.join(b, 'units', `${agentId}.json`),
    };
  }

  get manifest() {
    return {
      artifacts: path.join(this.base, 'manifest', 'artifacts.json'),
    };
  }
}
```

**Step 4: Run tests**
```bash
cd ~/mmx-v2 && npm test src/core/paths.test.ts
```
Expected: PASS

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/core/paths.ts src/core/paths.test.ts && git commit -m "feat(canon): artifact paths — all 8 stages, registry, events, manifest"
```

---

### Task 3: fid8 generator

**Files:**
- Create: `~/mmx-v2/src/core/fid8.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/core/fid8.test.ts
import { describe, it, expect } from 'vitest';
import { generateFid8, fid8FromFile, isValidFid8 } from './fid8.js';

describe('fid8', () => {
  it('generates 8-char hex id', () => {
    const id = generateFid8();
    expect(id).toHaveLength(8);
    expect(id).toMatch(/^[a-f0-9]{8}$/);
  });

  it('extracts fid8 from filename', () => {
    expect(fid8FromFile('ab12cd34.json')).toBe('ab12cd34');
    expect(fid8FromFile('ab12cd34.verdict.json')).toBe('ab12cd34');
  });

  it('validates fid8 format', () => {
    expect(isValidFid8('ab12cd34')).toBe(true);
    expect(isValidFid8('tooshort')).toBe(false);
    expect(isValidFid8('UPPERCASE')).toBe(false);
  });
});
```

**Step 2: Run to verify fail**
```bash
cd ~/mmx-v2 && npm test src/core/fid8.test.ts
```

**Step 3: Implement**

```typescript
// ~/mmx-v2/src/core/fid8.ts
import { randomBytes } from 'crypto';

export function generateFid8(): string {
  return randomBytes(4).toString('hex');
}

export function fid8FromFile(filename: string): string {
  return filename.split('.')[0];
}

export function isValidFid8(id: string): boolean {
  return /^[a-f0-9]{8}$/.test(id);
}
```

**Step 4: Run tests**
```bash
cd ~/mmx-v2 && npm test src/core/fid8.test.ts
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/core/fid8.ts src/core/fid8.test.ts && git commit -m "feat(canon): fid8 — 8-char finding identity generator"
```

---

### Task 4: Three Laws enforcement

**Files:**
- Create: `~/mmx-v2/src/core/three-laws.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/core/three-laws.test.ts
import { describe, it, expect } from 'vitest';
import { enforceLaws } from './three-laws.js';
import path from 'path';

describe('Three Laws', () => {
  it('throws when enginePath equals targetPath', async () => {
    await expect(enforceLaws({ enginePath: '/same', targetPath: '/same' }))
      .rejects.toThrow('ENGINE_EQUALS_TARGET');
  });

  it('throws when workspace would be outside .metamatrix', async () => {
    await expect(enforceLaws({ enginePath: '/engine', targetPath: '/target', workspacePath: '/outside' }))
      .rejects.toThrow('WORKSPACE_OUTSIDE_TARGET');
  });
});
```

**Step 2: Run to verify fail**
```bash
cd ~/mmx-v2 && npm test src/core/three-laws.test.ts
```

**Step 3: Implement**

```typescript
// ~/mmx-v2/src/core/three-laws.ts
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function enforceLaws(opts: {
  enginePath: string;
  targetPath: string;
  workspacePath?: string;
}): Promise<void> {
  const { enginePath, targetPath, workspacePath } = opts;

  // Law 1: Engine must not equal target
  if (path.resolve(enginePath) === path.resolve(targetPath)) {
    throw new Error('THREE_LAWS_VIOLATION: ENGINE_EQUALS_TARGET');
  }

  // Law 2: Workspace must be inside target/.metamatrix
  if (workspacePath) {
    const expectedBase = path.join(path.resolve(targetPath), '.metamatrix');
    if (!path.resolve(workspacePath).startsWith(expectedBase)) {
      throw new Error('THREE_LAWS_VIOLATION: WORKSPACE_OUTSIDE_TARGET');
    }
  }

  // Law 3: Target must not have dirty tracked files (ignores .metamatrix)
  try {
    const { stdout } = await execFileAsync('git', ['-C', targetPath, 'status', '--porcelain']);
    const dirty = stdout.split('\n').filter(l => l && !l.includes('.metamatrix'));
    if (dirty.length > 0) {
      throw new Error(`THREE_LAWS_VIOLATION: TARGET_DIRTY — ${dirty.length} uncommitted changes`);
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('THREE_LAWS_VIOLATION')) throw e;
    // not a git repo — that's ok, skip dirty check
  }
}
```

**Step 4: Run tests**
```bash
cd ~/mmx-v2 && npm test src/core/three-laws.test.ts
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/core/three-laws.ts src/core/three-laws.test.ts && git commit -m "feat(canon): Three Laws enforcement"
```

---

### Task 5: Contract registry — artifact-contracts + stage-routing

**Files:**
- Create: `~/mmx-v2/src/core/contracts.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/core/contracts.test.ts
import { describe, it, expect } from 'vitest';
import { ARTIFACT_CONTRACTS, STAGE_ROUTES, getRouteForRole } from './contracts.js';

describe('Contract registry', () => {
  it('has contracts for all 8 stages', () => {
    const stages = [...new Set(ARTIFACT_CONTRACTS.map(c => c.stage))];
    expect(stages).toContain('cathedral');
    expect(stages).toContain('distill');
    expect(stages).toContain('humangate');
  });

  it('every contract has required fields', () => {
    for (const c of ARTIFACT_CONTRACTS) {
      expect(c.handle).toBeTruthy();
      expect(c.ownerRole).toBeTruthy();
      expect(c.pathPattern).toContain('{run_id}');
    }
  });

  it('can look up route for a role', () => {
    const route = getRouteForRole('find-agent');
    expect(route).toBeDefined();
    expect(route?.stage).toBe('find');
  });
});
```

**Step 2: Run to verify fail**
```bash
cd ~/mmx-v2 && npm test src/core/contracts.test.ts
```

**Step 3: Implement contracts.ts**

```typescript
// ~/mmx-v2/src/core/contracts.ts
import type { StageId, ThreadMode } from './types.js';

export interface ArtifactContract {
  handle: string;
  stage: StageId;
  ownerRole: string;
  pathPattern: string; // uses {run_id}, {fid8}, {batch_id}, {branch}, {cycle}, {subrole}
  format: 'json' | 'markdown' | 'diff' | 'text' | 'html' | 'jsonl';
  cardinality: 'one' | 'many' | 'optional';
  branchScoped: boolean;
  canonical: boolean;
  consumers: string[];
}

export interface RoleRoute {
  role: string;
  stage: StageId;
  requiredInputs: string[]; // handles
  producedOutputs: string[]; // handles
  nextConsumers: string[];
  threadModeDefault: ThreadMode;
  tokenTarget: number;
}

export const ARTIFACT_CONTRACTS: ArtifactContract[] = [
  // Cathedral
  { handle: 'cathedral.brief', stage: 'cathedral', ownerRole: 'cathedral-agent', pathPattern: '.metamatrix/runs/{run_id}/cathedral/brief.md', format: 'markdown', cardinality: 'one', branchScoped: false, canonical: true, consumers: ['find-agent', 'orchestrator'] },
  { handle: 'cathedral.schematics', stage: 'cathedral', ownerRole: 'cathedral-agent', pathPattern: '.metamatrix/runs/{run_id}/cathedral/schematics/index.json', format: 'json', cardinality: 'one', branchScoped: false, canonical: true, consumers: ['find-agent', 'predict-da', 'dashboard'] },
  { handle: 'cathedral.briefing', stage: 'cathedral', ownerRole: 'cathedral-agent', pathPattern: '.metamatrix/runs/{run_id}/cathedral/briefings/{batch_id}.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: false, consumers: ['find-agent'] },
  // Find
  { handle: 'find.raw', stage: 'find', ownerRole: 'find-agent', pathPattern: '.metamatrix/runs/{run_id}/find/raw/{fid8}.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: false, consumers: ['find-merge'] },
  { handle: 'find.merged', stage: 'find', ownerRole: 'find-merge', pathPattern: '.metamatrix/runs/{run_id}/find/merged/{fid8}.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: false, consumers: ['distill-challenger', 'dashboard'] },
  { handle: 'find.convergence', stage: 'find', ownerRole: 'find-convergence', pathPattern: '.metamatrix/runs/{run_id}/find/convergence/{fid8}.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: true, consumers: ['distill-challenger', 'predict-da'] },
  { handle: 'find.convergence-matrix', stage: 'find', ownerRole: 'find-convergence', pathPattern: '.metamatrix/runs/{run_id}/find/convergence/convergence-matrix.json', format: 'json', cardinality: 'one', branchScoped: false, canonical: true, consumers: ['dashboard', 'predict-da'] },
  // Distill
  { handle: 'distill.verdict', stage: 'distill', ownerRole: 'distill-challenger', pathPattern: '.metamatrix/runs/{run_id}/distill/verdicts/{fid8}.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: true, consumers: ['distill-packager', 'dashboard'] },
  { handle: 'distill.challenge', stage: 'distill', ownerRole: 'distill-challenger', pathPattern: '.metamatrix/runs/{run_id}/distill/challenges/{fid8}.md', format: 'markdown', cardinality: 'many', branchScoped: false, canonical: false, consumers: ['dashboard'] },
  { handle: 'distill.approved', stage: 'distill', ownerRole: 'distill-packager', pathPattern: '.metamatrix/runs/{run_id}/distill/approved/{fid8}.packet.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: true, consumers: ['predict-da', 'predict-fsm', 'predict-g5', 'predict-simverify'] },
  // Predict
  { handle: 'predict.da', stage: 'predict', ownerRole: 'predict-da', pathPattern: '.metamatrix/runs/{run_id}/predict/da/{fid8}.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: false, consumers: ['predict-packager'] },
  { handle: 'predict.fsm', stage: 'predict', ownerRole: 'predict-fsm', pathPattern: '.metamatrix/runs/{run_id}/predict/fsm/{fid8}.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: false, consumers: ['predict-packager'] },
  { handle: 'predict.g5', stage: 'predict', ownerRole: 'predict-g5', pathPattern: '.metamatrix/runs/{run_id}/predict/g5/{fid8}.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: false, consumers: ['predict-packager'] },
  { handle: 'predict.simverify', stage: 'predict', ownerRole: 'predict-simverify', pathPattern: '.metamatrix/runs/{run_id}/predict/simverify/{fid8}.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: false, consumers: ['predict-packager'] },
  { handle: 'predict.approved', stage: 'predict', ownerRole: 'predict-packager', pathPattern: '.metamatrix/runs/{run_id}/predict/approved/{fid8}.packet.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: true, consumers: ['propose-architect'] },
  // Propose
  { handle: 'propose.proposal', stage: 'propose', ownerRole: 'propose-architect', pathPattern: '.metamatrix/runs/{run_id}/propose/proposals/{fid8}.{branch}.json', format: 'json', cardinality: 'many', branchScoped: true, canonical: false, consumers: ['propose-scrutiny'] },
  { handle: 'propose.approved', stage: 'propose', ownerRole: 'propose-adjudicator', pathPattern: '.metamatrix/runs/{run_id}/propose/approved/{fid8}.{branch}.packet.json', format: 'json', cardinality: 'many', branchScoped: true, canonical: true, consumers: ['implement-holistic'] },
  // Implement
  { handle: 'implement.patch', stage: 'implement', ownerRole: 'implement-holistic', pathPattern: '.metamatrix/runs/{run_id}/implement/patches/{fid8}.{cycle}.diff', format: 'diff', cardinality: 'many', branchScoped: false, canonical: false, consumers: ['finalguard-agent'] },
  { handle: 'implement.approved', stage: 'implement', ownerRole: 'implement-packager', pathPattern: '.metamatrix/runs/{run_id}/implement/approved/{fid8}.packet.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: true, consumers: ['finalguard-agent'] },
  { handle: 'implement.ifr', stage: 'implement', ownerRole: 'implement-holistic', pathPattern: '.metamatrix/runs/{run_id}/implement/ifr/{fid8}.{cycle}.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: false, consumers: ['finalguard-agent', 'humangate-packager'] },
  // FinalGuard
  { handle: 'finalguard.verdict', stage: 'finalguard', ownerRole: 'finalguard-agent', pathPattern: '.metamatrix/runs/{run_id}/finalguard/verdicts/{fid8}.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: true, consumers: ['humangate-packager', 'dashboard'] },
  { handle: 'finalguard.receipt', stage: 'finalguard', ownerRole: 'finalguard-agent', pathPattern: '.metamatrix/runs/{run_id}/finalguard/receipt/{fid8}.html', format: 'html', cardinality: 'optional', branchScoped: false, canonical: false, consumers: ['dashboard'] },
  // HumanGate
  { handle: 'humangate.packet', stage: 'humangate', ownerRole: 'humangate-packager', pathPattern: '.metamatrix/runs/{run_id}/human/packets/{fid8}.packet.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: true, consumers: ['human-reviewer'] },
  { handle: 'humangate.decision', stage: 'humangate', ownerRole: 'human-reviewer', pathPattern: '.metamatrix/runs/{run_id}/human/decisions/{fid8}.json', format: 'json', cardinality: 'many', branchScoped: false, canonical: true, consumers: ['registry', 'dashboard'] },
];

export const STAGE_ROUTES: RoleRoute[] = [
  { role: 'cathedral-agent', stage: 'cathedral', requiredInputs: [], producedOutputs: ['cathedral.brief', 'cathedral.schematics'], nextConsumers: ['find-agent'], threadModeDefault: 'forked', tokenTarget: 700 },
  { role: 'find-agent', stage: 'find', requiredInputs: ['cathedral.brief', 'cathedral.schematics'], producedOutputs: ['find.raw'], nextConsumers: ['find-merge'], threadModeDefault: 'fresh', tokenTarget: 500 },
  { role: 'distill-challenger', stage: 'distill', requiredInputs: ['find.convergence'], producedOutputs: ['distill.verdict', 'distill.challenge'], nextConsumers: ['distill-packager'], threadModeDefault: 'fresh', tokenTarget: 450 },
  { role: 'predict-da', stage: 'predict', requiredInputs: ['distill.approved'], producedOutputs: ['predict.da'], nextConsumers: ['predict-packager'], threadModeDefault: 'fresh', tokenTarget: 600 },
  { role: 'predict-fsm', stage: 'predict', requiredInputs: ['distill.approved'], producedOutputs: ['predict.fsm'], nextConsumers: ['predict-packager'], threadModeDefault: 'fresh', tokenTarget: 600 },
  { role: 'predict-g5', stage: 'predict', requiredInputs: ['distill.approved'], producedOutputs: ['predict.g5'], nextConsumers: ['predict-packager'], threadModeDefault: 'fresh', tokenTarget: 600 },
  { role: 'predict-simverify', stage: 'predict', requiredInputs: ['distill.approved'], producedOutputs: ['predict.simverify'], nextConsumers: ['predict-packager'], threadModeDefault: 'fresh', tokenTarget: 600 },
  { role: 'propose-architect', stage: 'propose', requiredInputs: ['predict.approved'], producedOutputs: ['propose.proposal'], nextConsumers: ['propose-scrutiny'], threadModeDefault: 'forked', tokenTarget: 900 },
  { role: 'implement-holistic', stage: 'implement', requiredInputs: ['propose.approved'], producedOutputs: ['implement.patch', 'implement.tests', 'implement.facts'], nextConsumers: ['implement-packager'], threadModeDefault: 'fresh', tokenTarget: 850 },
  { role: 'finalguard-agent', stage: 'finalguard', requiredInputs: ['implement.approved'], producedOutputs: ['finalguard.verdict', 'finalguard.receipt'], nextConsumers: ['humangate-packager'], threadModeDefault: 'fresh', tokenTarget: 600 },
];

export function getRouteForRole(role: string): RoleRoute | undefined {
  return STAGE_ROUTES.find(r => r.role === role);
}

export function getContractsForStage(stage: StageId): ArtifactContract[] {
  return ARTIFACT_CONTRACTS.filter(c => c.stage === stage);
}
```

**Step 4: Run tests**
```bash
cd ~/mmx-v2 && npm test src/core/contracts.test.ts
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/core/contracts.ts src/core/contracts.test.ts && git commit -m "feat(canon): contract registry — artifact-contracts + stage-routing"
```

---

## Phase 2 — Enforcement Layer

### Task 6: Event spine — activity.jsonl writer

**Files:**
- Create: `~/mmx-v2/src/enforcement/events.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/enforcement/events.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { EventSpine, EventType } from './events.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

describe('EventSpine', () => {
  let tmpDir: string;
  let spine: EventSpine;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-test-'));
    spine = new EventSpine(path.join(tmpDir, 'activity.jsonl'));
  });

  it('appends events as JSONL', async () => {
    await spine.emit({ event_type: 'RUN_CREATED', run_id: 'mmx-abc1', agent_id: null, stage: null, role: null });
    const lines = (await fs.readFile(spine.filePath, 'utf-8')).trim().split('\n');
    expect(lines).toHaveLength(1);
    const event = JSON.parse(lines[0]);
    expect(event.event_type).toBe('RUN_CREATED');
    expect(event.ts).toBeDefined();
  });

  it('creates parent directories', async () => {
    const nested = new EventSpine(path.join(tmpDir, 'deep', 'nested', 'activity.jsonl'));
    await nested.emit({ event_type: 'RUN_CREATED', run_id: 'x', agent_id: null, stage: null, role: null });
    expect(await fs.access(nested.filePath).then(() => true).catch(() => false)).toBe(true);
  });
});
```

**Step 2: Run to verify fail**
```bash
cd ~/mmx-v2 && npm test src/enforcement/events.test.ts
```

**Step 3: Implement**

```typescript
// ~/mmx-v2/src/enforcement/events.ts
import fs from 'fs/promises';
import path from 'path';

export type EventType =
  | 'RUN_CREATED' | 'UNIT_CREATED' | 'INPUT_VALIDATION_STARTED'
  | 'INPUT_VALIDATION_PASSED' | 'INPUT_VALIDATION_FAILED' | 'PROMPT_ASSEMBLED'
  | 'PROMPT_BUDGET_REJECTED' | 'DISPATCH_STARTED' | 'FORK_CREATED'
  | 'OUTPUT_WRITTEN' | 'OUTPUT_VALIDATION_STARTED' | 'OUTPUT_VALIDATION_PASSED'
  | 'OUTPUT_VALIDATION_FAILED' | 'DOWNSTREAM_UNBLOCKED' | 'UNIT_COMPLETE'
  | 'UNIT_BLOCKED' | 'UNIT_FAILED' | 'HUMAN_PACKET_CREATED'
  | 'HUMAN_DECISION_RECORDED' | 'BRANCH_ABANDONED' | 'BRANCH_APPROVED';

export interface ActivityEvent {
  event_type: EventType;
  run_id: string;
  agent_id: string | null;
  stage: string | null;
  role?: string | null;
  thread_mode?: 'fresh' | 'forked' | null;
  thread_id?: string | null;
  parent_thread_id?: string | null;
  fork_path?: string | null;
  artifact_path?: string | null;
  status?: string | null;
  details?: Record<string, unknown>;
}

export class EventSpine {
  constructor(public readonly filePath: string) {}

  async emit(event: ActivityEvent): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const record = { ts: new Date().toISOString(), ...event };
    await fs.appendFile(this.filePath, JSON.stringify(record) + '\n', 'utf-8');
  }

  async readAll(): Promise<ActivityEvent[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      return raw.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    } catch {
      return [];
    }
  }
}
```

**Step 4: Run tests**
```bash
cd ~/mmx-v2 && npm test src/enforcement/events.test.ts
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/enforcement/events.ts src/enforcement/events.test.ts && git commit -m "feat(enforcement): event spine — 21 event types, activity.jsonl"
```

---

### Task 7: Artifact validator — pre-dispatch input check

**Files:**
- Create: `~/mmx-v2/src/enforcement/validator.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/enforcement/validator.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { validateInputs, validateOutputs } from './validator.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { ArtifactIOItem } from '../core/types.js';

describe('validateInputs', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-val-'));
  });

  it('passes when all required files exist', async () => {
    const file = path.join(tmpDir, 'input.json');
    await fs.writeFile(file, '{}');
    const inputs: ArtifactIOItem[] = [{ handle: 'h', path: file, required: true, format: 'json', schema_ref: null, owner_role: null }];
    const result = await validateInputs(inputs);
    expect(result.ok).toBe(true);
  });

  it('fails when required file missing', async () => {
    const inputs: ArtifactIOItem[] = [{ handle: 'h', path: '/nonexistent/file.json', required: true, format: 'json', schema_ref: null, owner_role: null }];
    const result = await validateInputs(inputs);
    expect(result.ok).toBe(false);
    expect(result.violations[0]).toContain('CONTRACT_BREACH');
  });

  it('skips optional missing files', async () => {
    const inputs: ArtifactIOItem[] = [{ handle: 'h', path: '/nonexistent/file.json', required: false, format: 'json', schema_ref: null, owner_role: null }];
    const result = await validateInputs(inputs);
    expect(result.ok).toBe(true);
  });
});
```

**Step 2: Run to verify fail**
```bash
cd ~/mmx-v2 && npm test src/enforcement/validator.test.ts
```

**Step 3: Implement**

```typescript
// ~/mmx-v2/src/enforcement/validator.ts
import fs from 'fs/promises';
import type { ArtifactIOItem } from '../core/types.js';

export interface ValidationResult {
  ok: boolean;
  violations: string[];
}

export async function validateInputs(inputs: ArtifactIOItem[]): Promise<ValidationResult> {
  const violations: string[] = [];
  for (const input of inputs) {
    if (!input.required) continue;
    try {
      await fs.access(input.path);
      // For JSON, also check it parses
      if (input.format === 'json') {
        const raw = await fs.readFile(input.path, 'utf-8');
        JSON.parse(raw);
      }
    } catch {
      violations.push(`CONTRACT_BREACH: required input missing or invalid — handle="${input.handle}" path="${input.path}"`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export async function validateOutputs(outputs: ArtifactIOItem[]): Promise<ValidationResult> {
  const violations: string[] = [];
  for (const output of outputs) {
    if (!output.required) continue;
    try {
      await fs.access(output.path);
      if (output.format === 'json') {
        const raw = await fs.readFile(output.path, 'utf-8');
        JSON.parse(raw);
      }
    } catch {
      violations.push(`CONTRACT_BREACH: required output not written — handle="${output.handle}" path="${output.path}"`);
    }
  }
  return { ok: violations.length === 0, violations };
}
```

**Step 4: Run tests**
```bash
cd ~/mmx-v2 && npm test src/enforcement/validator.test.ts
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/enforcement/validator.ts src/enforcement/validator.test.ts && git commit -m "feat(enforcement): artifact validator — pre-dispatch input check"
```

---

### Task 8: Prompt assembler — 4-block envelope + token budget

**Files:**
- Create: `~/mmx-v2/src/enforcement/prompt-assembler.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/enforcement/prompt-assembler.test.ts
import { describe, it, expect } from 'vitest';
import { assemblePrompt, CORE_MICRO_SKILL, estimateTokens } from './prompt-assembler.js';

describe('assemblePrompt', () => {
  it('builds 4-block envelope in correct order', () => {
    const result = assemblePrompt({
      roleSkill: 'You are a find agent.',
      runCard: '{ "role": "find-agent" }',
      payload: 'Analyze this repo.',
      tokenBudget: 9999,
    });
    expect(result.ok).toBe(true);
    const idx1 = result.prompt!.indexOf(CORE_MICRO_SKILL);
    const idx2 = result.prompt!.indexOf('You are a find agent.');
    const idx3 = result.prompt!.indexOf('{ "role": "find-agent" }');
    const idx4 = result.prompt!.indexOf('Analyze this repo.');
    expect(idx1).toBeLessThan(idx2);
    expect(idx2).toBeLessThan(idx3);
    expect(idx3).toBeLessThan(idx4);
  });

  it('rejects when over token budget', () => {
    const result = assemblePrompt({
      roleSkill: 'x'.repeat(10000),
      runCard: 'y',
      payload: 'z',
      tokenBudget: 100,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('PROMPT_BUDGET_EXCEEDED');
  });
});
```

**Step 2: Run to verify fail**
```bash
cd ~/mmx-v2 && npm test src/enforcement/prompt-assembler.test.ts
```

**Step 3: Implement**

```typescript
// ~/mmx-v2/src/enforcement/prompt-assembler.ts

export const CORE_MICRO_SKILL = `You are an MMX execution unit.

Operational law:
- Read only the declared inputs.
- Write only the declared outputs.
- Never invent files or paths.
- Never rename outputs.
- If a required input is missing, stop with INPUT_CONTRACT_BREACH_STOP.
- If output cannot satisfy schema, stop with OUTPUT_CONTRACT_BREACH_STOP.
- The RUN_CARD contract overrides inherited context.
- Limit reasoning to the immediate task.
- Do not restate the entire system architecture.
- Produce outputs exactly in the declared format.

Token target: <= 200`;

// Rough token estimate: ~4 chars per token
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface AssembleResult {
  ok: boolean;
  prompt?: string;
  reason?: string;
  estimatedTokens?: number;
}

export function assemblePrompt(opts: {
  roleSkill: string;
  runCard: string;
  payload: string;
  tokenBudget: number;
}): AssembleResult {
  const prompt = [
    '## CORE_MICRO_SKILL\n' + CORE_MICRO_SKILL,
    '## ROLE_SKILL\n' + opts.roleSkill,
    '## RUN_CARD\n' + opts.runCard,
    '## PAYLOAD\n' + opts.payload,
  ].join('\n\n---\n\n');

  const tokens = estimateTokens(prompt);
  if (tokens > opts.tokenBudget) {
    return { ok: false, reason: 'PROMPT_BUDGET_EXCEEDED', estimatedTokens: tokens };
  }

  return { ok: true, prompt, estimatedTokens: tokens };
}
```

**Step 4: Run tests**
```bash
cd ~/mmx-v2 && npm test src/enforcement/prompt-assembler.test.ts
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/enforcement/prompt-assembler.ts src/enforcement/prompt-assembler.test.ts && git commit -m "feat(enforcement): prompt assembler — 4-block envelope, token budget gate"
```

---

### Task 9: State machine — run registry + unit states

**Files:**
- Create: `~/mmx-v2/src/state/machine.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/state/machine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RunRegistry } from './machine.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

describe('RunRegistry', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-state-'));
  });

  it('initializes a run', async () => {
    const reg = new RunRegistry(tmpDir, 'mmx-test1');
    await reg.init({ level: 1 });
    const state = await reg.read();
    expect(state.run_id).toBe('mmx-test1');
    expect(state.state).toBe('pending');
  });

  it('transitions state', async () => {
    const reg = new RunRegistry(tmpDir, 'mmx-test1');
    await reg.init({ level: 1 });
    await reg.transition('running');
    const state = await reg.read();
    expect(state.state).toBe('running');
  });
});
```

**Step 2: Run to verify fail**
```bash
cd ~/mmx-v2 && npm test src/state/machine.test.ts
```

**Step 3: Implement**

```typescript
// ~/mmx-v2/src/state/machine.ts
import fs from 'fs/promises';
import path from 'path';
import type { UnitState } from '../core/types.js';

export interface RunState {
  run_id: string;
  target_path: string;
  level: number;
  state: UnitState;
  active_stage: string | null;
  total_cost_usd: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  error: string | null;
}

export class RunRegistry {
  private registryPath: string;

  constructor(targetPath: string, private runId: string) {
    this.registryPath = path.join(targetPath, '.metamatrix', 'runs', runId, 'registry', 'run.json');
  }

  async init(opts: { level: number; targetPath?: string }): Promise<void> {
    await fs.mkdir(path.dirname(this.registryPath), { recursive: true });
    const state: RunState = {
      run_id: this.runId,
      target_path: opts.targetPath ?? '',
      level: opts.level,
      state: 'pending',
      active_stage: null,
      total_cost_usd: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      error: null,
    };
    await fs.writeFile(this.registryPath, JSON.stringify(state, null, 2), 'utf-8');
  }

  async read(): Promise<RunState> {
    const raw = await fs.readFile(this.registryPath, 'utf-8');
    return JSON.parse(raw);
  }

  async transition(newState: UnitState, opts?: { stage?: string; costUsd?: number; error?: string }): Promise<void> {
    const current = await this.read();
    const updated: RunState = {
      ...current,
      state: newState,
      active_stage: opts?.stage ?? current.active_stage,
      total_cost_usd: current.total_cost_usd + (opts?.costUsd ?? 0),
      updated_at: new Date().toISOString(),
      completed_at: ['complete', 'failed'].includes(newState) ? new Date().toISOString() : current.completed_at,
      error: opts?.error ?? current.error,
    };
    await fs.writeFile(this.registryPath, JSON.stringify(updated, null, 2), 'utf-8');
  }
}
```

**Step 4: Run tests**
```bash
cd ~/mmx-v2 && npm test src/state/machine.test.ts
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/state/machine.ts src/state/machine.test.ts && git commit -m "feat(enforcement): state machine — RunRegistry, 12 unit states"
```

---

### Task 10: SDK runner — Agent SDK, no API key, cost tracking

**Files:**
- Create: `~/mmx-v2/src/runner/sdk-runner.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/runner/sdk-runner.test.ts
import { describe, it, expect } from 'vitest';
import { buildPromptOptions, COMPLETION_SIGNAL } from './sdk-runner.js';

describe('SDK runner', () => {
  it('builds options without apiKey', () => {
    const opts = buildPromptOptions({ model: 'claude-opus-4-6', systemPrompt: 'sys', maxTurns: 10 });
    expect(opts.model).toBe('claude-opus-4-6');
    expect('apiKey' in opts).toBe(false);
  });

  it('appends completion signal to system prompt', () => {
    const opts = buildPromptOptions({ model: 'claude-opus-4-6', systemPrompt: 'sys', maxTurns: 5 });
    expect(opts.systemPrompt).toContain(COMPLETION_SIGNAL);
  });
});
```

**Step 2: Run to verify fail**
```bash
cd ~/mmx-v2 && npm test src/runner/sdk-runner.test.ts
```

**Step 3: Implement**

```typescript
// ~/mmx-v2/src/runner/sdk-runner.ts
import type { RunCard, RunnerResult } from '../core/types.js';

export const COMPLETION_SIGNAL = 'AUTONOMOUS_COMPLETE';
export const DEFAULT_MODEL = 'claude-opus-4-6';

export function buildPromptOptions(opts: { model: string; systemPrompt: string; maxTurns: number }) {
  return {
    model: opts.model,
    systemPrompt: `${opts.systemPrompt}\n\nWhen your task is complete, output "${COMPLETION_SIGNAL}" on its own line.`,
    maxTurns: opts.maxTurns,
    // NO apiKey — Max subscription authenticates via Claude Code CLI automatically
  };
}

export async function runWithSDK(opts: {
  runCard: RunCard;
  assembledPrompt: string; // the 4-block envelope from prompt-assembler
  payload: string;
  onOutput?: (text: string) => void;
}): Promise<RunnerResult> {
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  const promptOpts = buildPromptOptions({
    model: opts.runCard.model || DEFAULT_MODEL,
    systemPrompt: opts.assembledPrompt,
    maxTurns: opts.runCard.thread.max_turns ?? 20,
  });

  const outputParts: string[] = [];
  let completed = false;
  let costUsd = 0;

  try {
    const stream = query({
      prompt: opts.payload,
      options: {
        model: promptOpts.model,
        systemPrompt: promptOpts.systemPrompt,
        maxTurns: promptOpts.maxTurns,
      },
    });

    for await (const event of stream) {
      if (event.type === 'assistant' && event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'text') {
            outputParts.push(block.text);
            opts.onOutput?.(block.text);
            if (block.text.includes(COMPLETION_SIGNAL)) completed = true;
          }
        }
      }
      // Extract cost from usage events
      if ((event as Record<string, unknown>).usage) {
        const usage = (event as Record<string, unknown>).usage as Record<string, number>;
        if (usage.input_tokens && usage.output_tokens) {
          // Opus 4.6 pricing: $15/M input, $75/M output
          costUsd = (usage.input_tokens / 1_000_000) * 15 + (usage.output_tokens / 1_000_000) * 75;
        }
      }
    }

    return { ok: true, output: outputParts.join(''), completed, costUsd };
  } catch (err) {
    return { ok: false, output: '', completed: false, costUsd, error: String(err) };
  }
}
```

**Step 4: Run tests**
```bash
cd ~/mmx-v2 && npm test src/runner/sdk-runner.test.ts
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/runner/sdk-runner.ts src/runner/sdk-runner.test.ts && git commit -m "feat(enforcement): SDK runner — Max subscription, cost tracking, no apiKey"
```

---

### Task 11: Daemon — hang detection + backoff

**Files:**
- Create: `~/mmx-v2/src/runner/daemon.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/runner/daemon.test.ts
import { describe, it, expect, vi } from 'vitest';
import { HangDetector } from './daemon.js';

describe('HangDetector', () => {
  it('detects silence after timeout', async () => {
    vi.useFakeTimers();
    const detector = new HangDetector({ timeoutMs: 1000 });
    detector.start();
    vi.advanceTimersByTime(1100);
    expect(detector.isHanging()).toBe(true);
    vi.useRealTimers();
  });

  it('resets on activity', async () => {
    vi.useFakeTimers();
    const detector = new HangDetector({ timeoutMs: 1000 });
    detector.start();
    vi.advanceTimersByTime(500);
    detector.ping();
    vi.advanceTimersByTime(600);
    expect(detector.isHanging()).toBe(false);
    vi.useRealTimers();
  });
});
```

**Step 2: Run to verify fail**
```bash
cd ~/mmx-v2 && npm test src/runner/daemon.test.ts
```

**Step 3: Implement**

```typescript
// ~/mmx-v2/src/runner/daemon.ts

export interface DaemonOptions {
  timeoutMs: number;
  maxRetries?: number;
}

export class HangDetector {
  private lastActivity: number = Date.now();
  private timeoutMs: number;

  constructor(opts: DaemonOptions) {
    this.timeoutMs = opts.timeoutMs;
  }

  start(): void {
    this.lastActivity = Date.now();
  }

  ping(): void {
    this.lastActivity = Date.now();
  }

  isHanging(): boolean {
    return Date.now() - this.lastActivity > this.timeoutMs;
  }
}

export function backoffMs(attempt: number, baseMs = 2000, capMs = 30000): number {
  return Math.min(baseMs * Math.pow(2, attempt), capMs);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries: number; timeoutMs: number; onRetry?: (attempt: number) => void }
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= opts.maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < opts.maxRetries) {
        opts.onRetry?.(i + 1);
        await new Promise(r => setTimeout(r, backoffMs(i)));
      }
    }
  }
  throw lastErr;
}
```

**Step 4: Run tests**
```bash
cd ~/mmx-v2 && npm test src/runner/daemon.test.ts
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/runner/daemon.ts src/runner/daemon.test.ts && git commit -m "feat(enforcement): daemon — hang detection, exponential backoff"
```

---

## Phase 3 — Stage Runtime

### Task 12: Role prompts — all 10 role skill files

**Files:**
- Create: `~/mmx-v2/prompts/roles/cathedral.md`
- Create: `~/mmx-v2/prompts/roles/find.md`
- Create: `~/mmx-v2/prompts/roles/distill-challenger.md`
- Create: `~/mmx-v2/prompts/roles/predict-da.md`
- Create: `~/mmx-v2/prompts/roles/predict-fsm.md`
- Create: `~/mmx-v2/prompts/roles/predict-g5.md`
- Create: `~/mmx-v2/prompts/roles/predict-simverify.md`
- Create: `~/mmx-v2/prompts/roles/propose-architect.md`
- Create: `~/mmx-v2/prompts/roles/implement-holistic.md`
- Create: `~/mmx-v2/prompts/roles/finalguard.md`

**Reference:** Read `/Users/ali/Downloads/MMX 2.txt` sections for MMX_PROMPT_CANON to get exact role skill text for each role. Search for "ROLE_SKILL" or the role name.

**Step 1:** Create `prompts/roles/` directory and write each role prompt as a markdown file. Each file should contain ONLY the ROLE_SKILL block content (not the 4-block envelope — the prompt assembler adds that).

**Step 2:** Write a test that all role files exist and are non-empty:

```typescript
// ~/mmx-v2/src/runner/role-loader.test.ts
import { describe, it, expect } from 'vitest';
import { loadRoleSkill } from './role-loader.js';

describe('role-loader', () => {
  const roles = ['cathedral', 'find', 'distill-challenger', 'predict-da', 'predict-fsm', 'predict-g5', 'predict-simverify', 'propose-architect', 'implement-holistic', 'finalguard'];
  for (const role of roles) {
    it(`loads ${role} role skill`, async () => {
      const text = await loadRoleSkill(role);
      expect(text.length).toBeGreaterThan(50);
    });
  }
});
```

**Step 3:** Create `src/runner/role-loader.ts`:

```typescript
// ~/mmx-v2/src/runner/role-loader.ts
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const PROMPTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../prompts/roles');

export async function loadRoleSkill(role: string): Promise<string> {
  const filePath = path.join(PROMPTS_DIR, `${role}.md`);
  return fs.readFile(filePath, 'utf-8');
}
```

**Step 4: Run tests**
```bash
cd ~/mmx-v2 && npm test src/runner/role-loader.test.ts
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add prompts/ src/runner/role-loader.ts src/runner/role-loader.test.ts && git commit -m "feat(stages): role prompts — all 10 roles from MMX_PROMPT_CANON"
```

---

### Task 13: Cathedral stage

**Files:**
- Create: `~/mmx-v2/src/stages/cathedral/index.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/stages/cathedral/cathedral.test.ts
import { describe, it, expect } from 'vitest';
import { runCathedral } from './index.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

describe('Cathedral stage', () => {
  it('produces correct artifact paths (dryRun)', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-cat-'));
    const result = await runCathedral({ targetPath: tmpDir, runId: 'mmx-test', level: 1, dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.outputPaths['brief']).toContain('cathedral/brief.md');
    expect(result.outputPaths['schematics']).toContain('cathedral/schematics/index.json');
    // Verify files were actually written
    await expect(fs.access(result.outputPaths['brief']!)).resolves.toBeUndefined();
    await expect(fs.access(result.outputPaths['schematics']!)).resolves.toBeUndefined();
  });
});
```

**Step 2: Run to verify fail**
```bash
cd ~/mmx-v2 && npm test src/stages/cathedral/cathedral.test.ts
```

**Step 3: Implement cathedral stage**

```typescript
// ~/mmx-v2/src/stages/cathedral/index.ts
import fs from 'fs/promises';
import path from 'path';
import { Paths } from '../../core/paths.js';
import { validateInputs, validateOutputs } from '../../enforcement/validator.js';
import { assemblePrompt } from '../../enforcement/prompt-assembler.js';
import { loadRoleSkill } from '../../runner/role-loader.js';
import { runWithSDK } from '../../runner/sdk-runner.js';
import { EventSpine } from '../../enforcement/events.js';
import type { StageResult, RunCard } from '../../core/types.js';

export async function runCathedral(opts: {
  targetPath: string;
  runId: string;
  level: number;
  dryRun?: boolean;
}): Promise<StageResult> {
  const paths = new Paths(opts.targetPath, opts.runId);
  const events = new EventSpine(paths.events.activity);

  await fs.mkdir(path.dirname(paths.cathedral.brief), { recursive: true });
  await fs.mkdir(path.dirname(paths.cathedral.schematics), { recursive: true });

  await events.emit({ event_type: 'DISPATCH_STARTED', run_id: opts.runId, agent_id: 'cathedral-agent', stage: 'cathedral', role: 'cathedral-agent' });

  if (opts.dryRun) {
    const brief = `# Cathedral Brief\n\nrun_id: ${opts.runId}\ntarget: ${opts.targetPath}\nLevel: ${opts.level}\n`;
    const schematics = JSON.stringify({ run_id: opts.runId, subsystems: [], source_refs: [], generated_at: new Date().toISOString() }, null, 2);
    await fs.writeFile(paths.cathedral.brief, brief, 'utf-8');
    await fs.writeFile(paths.cathedral.schematics, schematics, 'utf-8');
    await events.emit({ event_type: 'UNIT_COMPLETE', run_id: opts.runId, agent_id: 'cathedral-agent', stage: 'cathedral', role: 'cathedral-agent', status: 'dryRun' });
    return { ok: true, runId: opts.runId, stage: 'cathedral', outputPaths: { brief: paths.cathedral.brief, schematics: paths.cathedral.schematics }, costUsd: 0 };
  }

  // Real execution
  const roleSkill = await loadRoleSkill('cathedral');
  const runCard: RunCard = {
    contract_type: 'forked_agent',
    run_id: opts.runId,
    agent_id: 'cathedral-agent',
    stage: 'cathedral',
    role: 'cathedral-agent',
    thread_mode: 'forked',
    model: 'claude-opus-4-6',
    thread: { parent_thread_id: null, fork_root_thread_id: null, fork_path: null, fork_depth: null, fork_reason: null, max_turns: 20 },
    inputs: [],
    outputs: [
      { handle: 'cathedral.brief', path: paths.cathedral.brief, required: true, format: 'markdown', schema_ref: null, owner_role: 'cathedral-agent' },
      { handle: 'cathedral.schematics', path: paths.cathedral.schematics, required: true, format: 'json', schema_ref: null, owner_role: 'cathedral-agent' },
    ],
    rules: ['write only declared outputs', 'do not propose solutions', 'do not write findings'],
    acceptance_checks: [
      { description: 'brief.md exists and non-empty', required: true },
      { description: 'schematics/index.json parses as valid JSON', required: true },
    ],
    next_consumer: { role: 'find-agent', stage: 'find' },
  };

  const envelope = assemblePrompt({
    roleSkill,
    runCard: JSON.stringify(runCard, null, 2),
    payload: `Map the repository at ${opts.targetPath}. Write brief.md to ${paths.cathedral.brief} and schematics/index.json to ${paths.cathedral.schematics}.`,
    tokenBudget: 4650,
  });

  if (!envelope.ok) {
    return { ok: false, runId: opts.runId, stage: 'cathedral', outputPaths: {}, costUsd: 0, error: envelope.reason };
  }

  const result = await runWithSDK({ runCard, assembledPrompt: envelope.prompt!, payload: `Map repository: ${opts.targetPath}` });

  const validation = await validateOutputs(runCard.outputs);
  if (!validation.ok) {
    await events.emit({ event_type: 'OUTPUT_VALIDATION_FAILED', run_id: opts.runId, agent_id: 'cathedral-agent', stage: 'cathedral', role: 'cathedral-agent', details: { violations: validation.violations } });
    return { ok: false, runId: opts.runId, stage: 'cathedral', outputPaths: {}, costUsd: result.costUsd, error: validation.violations.join('; ') };
  }

  await events.emit({ event_type: 'UNIT_COMPLETE', run_id: opts.runId, agent_id: 'cathedral-agent', stage: 'cathedral', role: 'cathedral-agent' });
  return { ok: true, runId: opts.runId, stage: 'cathedral', outputPaths: { brief: paths.cathedral.brief, schematics: paths.cathedral.schematics }, costUsd: result.costUsd };
}
```

**Step 4: Run tests**
```bash
cd ~/mmx-v2 && npm test src/stages/cathedral/cathedral.test.ts
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/stages/cathedral/ && git commit -m "feat(stages): Cathedral — correct artifact paths, 4-block envelope, output validation"
```

---

### Task 14: Find stage

**Reference:** Read `/Users/ali/Downloads/MMX 2.txt` for the Find stage implementation code (search "run-find-stage" or "find-agent").

**Files:**
- Create: `~/mmx-v2/src/stages/find/index.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/stages/find/find.test.ts
import { describe, it, expect } from 'vitest';
import { runFind } from './index.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

describe('Find stage', () => {
  it('produces raw findings with fid8 filenames (dryRun)', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-find-'));
    // Set up cathedral outputs first
    const paths = new (await import('../../core/paths.js')).Paths(tmpDir, 'mmx-test');
    await fs.mkdir(path.dirname(paths.cathedral.brief), { recursive: true });
    await fs.mkdir(path.dirname(paths.cathedral.schematics), { recursive: true });
    await fs.writeFile(paths.cathedral.brief, '# Brief', 'utf-8');
    await fs.writeFile(paths.cathedral.schematics, '{"subsystems":[]}', 'utf-8');

    const result = await runFind({ targetPath: tmpDir, runId: 'mmx-test', level: 1, dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.outputPaths['convergenceMatrix']).toContain('convergence-matrix.json');
  });
});
```

**Step 2–5:** Follow same pattern as Cathedral — implement, test, commit.

**Implementation note:** Find stage dispatches multiple find-agent instances (one per subsystem from cathedral schematics), then runs merge + convergence steps. In dryRun, create 2 stub findings with generated fid8 IDs. Each stub finding goes to `find/raw/{fid8}.json`, `find/merged/{fid8}.json`, `find/convergence/{fid8}.json`. Write `convergence-matrix.json` listing all fid8s with status `converged`.

```bash
git commit -m "feat(stages): Find — raw/merged/convergence artifacts, fid8 identity, convergence-matrix"
```

---

### Task 15: Distill stage — challenger + adjudicator

**Reference:** Read `/Users/ali/Downloads/MMX 2.txt` for Distill implementation (search "run-distill-stage", "distill-challenger", adjudicator logic: `weakens >= 4 → reject`, `supports >= 3 → approve`).

**Files:**
- Create: `~/mmx-v2/src/stages/distill/index.ts`
- Create: `~/mmx-v2/src/stages/distill/adjudicator.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/stages/distill/distill.test.ts
import { describe, it, expect } from 'vitest';
import { adjudicate } from './adjudicator.js';

describe('Distill adjudicator', () => {
  it('rejects when weakens >= 4', () => {
    const verdicts = [
      { supports: false, weakens: true }, { supports: false, weakens: true },
      { supports: false, weakens: true }, { supports: false, weakens: true },
      { supports: true, weakens: false },
    ];
    expect(adjudicate(verdicts).verdict).toBe('reject');
  });

  it('approves when supports >= 3', () => {
    const verdicts = [
      { supports: true, weakens: false }, { supports: true, weakens: false },
      { supports: true, weakens: false }, { supports: false, weakens: false },
      { supports: false, weakens: false },
    ];
    expect(adjudicate(verdicts).verdict).toBe('approve');
  });

  it('needs_revision otherwise', () => {
    const verdicts = [
      { supports: true, weakens: false }, { supports: true, weakens: false },
      { supports: false, weakens: true }, { supports: false, weakens: true },
      { supports: false, weakens: false },
    ];
    expect(adjudicate(verdicts).verdict).toBe('needs_revision');
  });
});
```

**Step 2–5:** Implement adjudicator, then full distill stage. In dryRun, read fid8s from convergence-matrix, create stub verdict + challenge files, create approved packets. Commit:

```bash
git commit -m "feat(stages): Distill — challenger, adjudicator (weakens≥4/supports≥3), approved packets"
```

---

### Task 16: Predict stage — 4 subroles in parallel

**Reference:** Read `/Users/ali/Downloads/MMX 2.txt` for Predict (search "run-predict-stage", "PREDICT_ROLES", "predict-da").

**Files:**
- Create: `~/mmx-v2/src/stages/predict/index.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/stages/predict/predict.test.ts
import { describe, it, expect } from 'vitest';
import { runPredict } from './index.js';
// ... setup distill outputs, run dryRun
// Verify: da/{fid8}.json, fsm/{fid8}.json, g5/{fid8}.json, simverify/{fid8}.json, approved/{fid8}.packet.json
```

**Implementation note:** Launch all 4 subroles in parallel per finding using `Promise.all`. Each writes its own artifact. Packager runs after all 4 complete and writes `predict/approved/{fid8}.packet.json` with merged `{ fid8, da, fsm, g5, simverify }`.

```bash
git commit -m "feat(stages): Predict — 4 subroles parallel (DA/FSM/G5/SimVerify), approved packets"
```

---

### Task 17: Propose stage — architect + scrutiny + adjudicator

**Reference:** Read `/Users/ali/Downloads/MMX 2.txt` for Propose (search "propose-architect", branch scoping).

**Files:**
- Create: `~/mmx-v2/src/stages/propose/index.ts`

**Implementation note:** Fork default for architect. Branches named 'a', 'b', 'c' (default: single branch 'a' unless multi-branch mode). Scrutiny role challenges each proposal. Adjudicator picks winning branch and writes `propose/approved/{fid8}.{branch}.packet.json`.

```bash
git commit -m "feat(stages): Propose — architect fork, scrutiny, adjudicator, branch scoping"
```

---

### Task 18: Implement stage — holistic + IFR

**Reference:** Read `/Users/ali/Downloads/MMX 2.txt` for Implement (search "implement-holistic", "IFR").

**Files:**
- Create: `~/mmx-v2/src/stages/implement/index.ts`

**Implementation note:** Writes `patches/{fid8}.{cycle}.diff`, `tests/{fid8}.{cycle}.json`, `facts/{fid8}.{cycle}.json`. On failure writes `ifr/{fid8}.{cycle}.json` with `failure_reason` + `remediation_suggestion`. Check `MMX_ALLOW_IFR_TO_FINAL_GUARD` env flag.

```bash
git commit -m "feat(stages): Implement — holistic, patches/tests/facts, IFR on failure"
```

---

### Task 19: FinalGuard stage

**Files:**
- Create: `~/mmx-v2/src/stages/finalguard/index.ts`

**Implementation note:** Fresh default. Writes `finalguard/verdicts/{fid8}.json` (verdict enum: approve/reject/needs_revision), `finalguard/notes/{fid8}.md`, `finalguard/receipt/{fid8}.html`. Verdict must contain: `verdict`, `fid8`, `supporting_refs[]`.

```bash
git commit -m "feat(stages): FinalGuard — verdict, notes, HTML receipt"
```

---

### Task 20: HumanGate

**Files:**
- Create: `~/mmx-v2/src/stages/humangate/index.ts`

**Implementation note:** Packager writes `human/packets/{fid8}.packet.json`. Waits for human decision. Decision schema: `{ actor, timestamp, decision: APPROVE|REJECT|SEND_BACK|PARK, note?, fid8, run_id }`. Decision written to `human/decisions/{fid8}.json`. No automated stage may auto-approve.

```bash
git commit -m "feat(stages): HumanGate — packet creation, decision schema, APPROVE/REJECT/SEND_BACK/PARK"
```

---

### Task 21: Main orchestrator — run command wiring all stages

**Files:**
- Create: `~/mmx-v2/src/commands/run.ts`
- Create: `~/mmx-v2/src/commands/preflight.ts`
- Create: `~/mmx-v2/src/cli.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/commands/run.test.ts
import { describe, it, expect } from 'vitest';
import { run } from './run.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

describe('run command', () => {
  it('runs cathedral through find (dryRun)', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-run-'));
    await run({ targetPath: tmpDir, level: 1, dryRun: true, stages: ['cathedral', 'find'] });
    // Check state file exists
    const statePath = path.join(tmpDir, '.metamatrix', 'runs');
    const runs = await fs.readdir(statePath);
    expect(runs.length).toBeGreaterThan(0);
  });
});
```

**Step 3: Implement run.ts**

```typescript
// ~/mmx-v2/src/commands/run.ts
import { randomBytes } from 'crypto';
import { enforceLaws } from '../core/three-laws.js';
import { RunRegistry } from '../state/machine.js';
import { EventSpine } from '../enforcement/events.js';
import { Paths } from '../core/paths.js';
import { runCathedral } from '../stages/cathedral/index.js';
import { runFind } from '../stages/find/index.js';
import { runDistill } from '../stages/distill/index.js';
import { runPredict } from '../stages/predict/index.js';
import { runPropose } from '../stages/propose/index.js';
import { runImplement } from '../stages/implement/index.js';
import { runFinalGuard } from '../stages/finalguard/index.js';
import { runHumanGate } from '../stages/humangate/index.js';
import { fileURLToPath } from 'url';
import path from 'path';

const ALL_STAGES = ['cathedral', 'find', 'distill', 'predict', 'propose', 'implement', 'finalguard', 'humangate'] as const;

export async function run(opts: {
  targetPath: string;
  level: number;
  dryRun?: boolean;
  stages?: string[];
}): Promise<void> {
  const enginePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  await enforceLaws({ enginePath, targetPath: opts.targetPath });

  const runId = `mmx-${randomBytes(4).toString('hex')}`;
  const registry = new RunRegistry(opts.targetPath, runId);
  const paths = new Paths(opts.targetPath, runId);
  const events = new EventSpine(paths.events.activity);

  await registry.init({ level: opts.level, targetPath: opts.targetPath });
  await events.emit({ event_type: 'RUN_CREATED', run_id: runId, agent_id: null, stage: null, role: null });

  console.log(`\n🚀 MMX v2 run: ${runId}`);
  console.log(`Target: ${opts.targetPath}\n`);

  const stagesToRun = opts.stages ?? ALL_STAGES;
  const stageRunners: Record<string, () => Promise<unknown>> = {
    cathedral: () => runCathedral({ targetPath: opts.targetPath, runId, level: opts.level, dryRun: opts.dryRun }),
    find: () => runFind({ targetPath: opts.targetPath, runId, level: opts.level, dryRun: opts.dryRun }),
    distill: () => runDistill({ targetPath: opts.targetPath, runId, dryRun: opts.dryRun }),
    predict: () => runPredict({ targetPath: opts.targetPath, runId, dryRun: opts.dryRun }),
    propose: () => runPropose({ targetPath: opts.targetPath, runId, dryRun: opts.dryRun }),
    implement: () => runImplement({ targetPath: opts.targetPath, runId, dryRun: opts.dryRun }),
    finalguard: () => runFinalGuard({ targetPath: opts.targetPath, runId, dryRun: opts.dryRun }),
    humangate: () => runHumanGate({ targetPath: opts.targetPath, runId, dryRun: opts.dryRun }),
  };

  for (const stageName of stagesToRun) {
    console.log(`[ ${stageName.toUpperCase()} ] running...`);
    await registry.transition('running', { stage: stageName });
    const runner = stageRunners[stageName];
    if (!runner) { console.warn(`Unknown stage: ${stageName}`); continue; }
    const result = await runner() as { ok: boolean; costUsd: number; error?: string };
    if (!result.ok) {
      await registry.transition('failed', { error: result.error });
      console.error(`❌ ${stageName} failed: ${result.error}`);
      process.exit(1);
    }
    await registry.transition('complete', { costUsd: result.costUsd });
    console.log(`✅ ${stageName} complete`);
  }

  await events.emit({ event_type: 'UNIT_COMPLETE', run_id: runId, agent_id: null, stage: null, role: null, status: 'all_stages_done' });
  console.log('\n✅ MMX run complete');
}
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/commands/run.ts src/commands/run.test.ts src/cli.ts && git commit -m "feat(stages): orchestrator — all 8 stages wired, dryRun mode, event spine"
```

---

## Phase 4 — Dashboard Truth Layer

### Task 22: Dashboard server — SSE endpoint for activity.jsonl

**Files:**
- Create: `~/mmx-v2/src/commands/dashboard.ts`

**Step 1: Write failing test**

```typescript
// ~/mmx-v2/src/commands/dashboard.test.ts
import { describe, it, expect } from 'vitest';
import { buildDashboardServer } from './dashboard.js';

describe('dashboard server', () => {
  it('creates server instance', () => {
    const server = buildDashboardServer({ targetPath: '/tmp', port: 4243 });
    expect(server).toBeDefined();
  });
});
```

**Step 3: Implement dashboard server with SSE**

```typescript
// ~/mmx-v2/src/commands/dashboard.ts
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { Paths } from '../core/paths.js';

export function buildDashboardServer(opts: { targetPath: string; port: number }) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${opts.port}`);

    // SSE: live event stream for a run
    if (url.pathname === '/api/events' && req.method === 'GET') {
      const runId = url.searchParams.get('runId');
      if (!runId) { res.writeHead(400); res.end('missing runId'); return; }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      const paths = new Paths(opts.targetPath, runId);
      let lastSize = 0;

      const send = async () => {
        try {
          const stat = await fs.stat(paths.events.activity).catch(() => null);
          if (!stat || stat.size === lastSize) return;
          const raw = await fs.readFile(paths.events.activity, 'utf-8');
          const lines = raw.trim().split('\n').slice(lastSize === 0 ? 0 : -1);
          for (const line of lines) {
            if (line) res.write(`data: ${line}\n\n`);
          }
          lastSize = stat.size;
        } catch {}
      };

      const interval = setInterval(send, 500);
      req.on('close', () => clearInterval(interval));
      return;
    }

    // REST: list runs
    if (url.pathname === '/api/runs' && req.method === 'GET') {
      try {
        const runsBase = path.join(opts.targetPath, '.metamatrix', 'runs');
        const runIds = await fs.readdir(runsBase).catch(() => []);
        const runs = await Promise.all(runIds.map(async id => {
          const paths = new Paths(opts.targetPath, id);
          const raw = await fs.readFile(paths.registry.run, 'utf-8').catch(() => null);
          return raw ? JSON.parse(raw) : null;
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ runs: runs.filter(Boolean) }));
      } catch (e) {
        res.writeHead(500); res.end(String(e));
      }
      return;
    }

    // Serve dashboard React app
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const distPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../dashboard/dist/index.html');
      try {
        const html = await fs.readFile(distPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } catch {
        res.writeHead(404); res.end('Dashboard not built. Run: cd dashboard && npm run build');
      }
      return;
    }

    res.writeHead(404); res.end('Not found');
  });

  return server;
}

export function startDashboard(opts: { targetPath: string; port?: number }): void {
  const port = opts.port ?? 4242;
  const server = buildDashboardServer({ targetPath: opts.targetPath, port });
  server.listen(port, () => {
    console.log(`🖥  Dashboard: http://localhost:${port}`);
    console.log(`Target: ${opts.targetPath}`);
  });
}
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/commands/dashboard.ts src/commands/dashboard.test.ts && git commit -m "feat(dashboard): SSE event stream /api/events, REST /api/runs"
```

---

### Task 23: Dashboard React app — stage spine + event feed + artifact browser

**Files:**
- Create: `~/mmx-v2/dashboard/src/main.tsx`
- Create: `~/mmx-v2/dashboard/src/App.tsx`
- Create: `~/mmx-v2/dashboard/src/components/StageSpine.tsx`
- Create: `~/mmx-v2/dashboard/src/components/EventFeed.tsx`
- Create: `~/mmx-v2/dashboard/src/components/RunHistory.tsx`
- Create: `~/mmx-v2/dashboard/src/components/ArtifactBrowser.tsx`
- Create: `~/mmx-v2/dashboard/src/components/CostBreakdown.tsx`
- Create: `~/mmx-v2/dashboard/src/context/DashboardContext.tsx`

**Architecture:**
- `DashboardContext` polls `/api/runs` every 5s for run list
- `EventFeed` connects to `/api/events?runId=X` via `EventSource` (SSE) — same pattern as AIMS uses in `app/feed/GlobalFeedClient.tsx`
- `StageSpine` shows all 8 stages with status indicators from run registry state
- `ArtifactBrowser` reads artifact paths from run registry and displays file tree
- `CostBreakdown` shows per-stage `costUsd` from state transitions

**Reference:** Use AIMS's `app/feed/GlobalFeedClient.tsx` SSE pattern exactly:
```typescript
const es = new EventSource(`/api/events?runId=${runId}`);
es.onmessage = (e) => { const event = JSON.parse(e.data); /* update UI */ };
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add dashboard/src/ && git commit -m "feat(dashboard): stage spine, event feed SSE, artifact browser, cost breakdown"
```

---

### Task 24: AIMS adapter — 7-method contract

**Reference:** Check `/Users/ali/aims/lib/agent-sdk.ts` for the AIMSAgent class that mmx-v2 should call into.

**Files:**
- Create: `~/mmx-v2/src/aims/adapter.ts`

**Implementation:** Thin adapter wrapping the 7 AIMS API endpoints. Silent offline fallback when `AIMS_URL`/`AIMS_API_KEY` env vars absent. Never throws — agent comms must not block execution.

```typescript
// ~/mmx-v2/src/aims/adapter.ts
export function createAimsAdapter() {
  const baseUrl = process.env.AIMS_URL;
  const apiKey = process.env.AIMS_API_KEY;
  if (!baseUrl || !apiKey) return null;
  // ... 7 methods: register, heartbeat, taskUpdate, blocker, planSignal, spawnRequest, directive
}
```

**Step 5: Commit**
```bash
cd ~/mmx-v2 && git add src/aims/ && git commit -m "feat: AIMS adapter — 7-method contract, silent offline fallback"
```

---

## Phase 5 — Verification + Push

### Task 25: Full test suite run

```bash
cd ~/mmx-v2 && npm test
```
Expected: All tests pass. Fix any failures before continuing.

---

### Task 26: TypeScript build verification

```bash
cd ~/mmx-v2 && npm run build
cd ~/mmx-v2/dashboard && npm run build
```
Expected: Zero errors.

---

### Task 27: dryRun end-to-end smoke test

```bash
cd ~/mmx-v2 && node dist/cli.js run /tmp/mmx-smoke-test --dry-run
```
Expected:
- All 8 stages execute in order
- `.metamatrix/runs/<runId>/` created with correct artifact structure
- `events/activity.jsonl` populated with 21 event types
- No errors

---

### Task 28: Dashboard smoke test

```bash
cd ~/mmx-v2 && node dist/cli.js dashboard --repo /tmp/mmx-smoke-test
```
Open `http://localhost:4242`. Verify:
- Run list shows the dryRun run
- Stage spine shows all 8 stages
- EventFeed shows events from activity.jsonl
- ArtifactBrowser shows correct paths

---

### Task 29: Push to GitHub

```bash
cd ~/mmx-v2
gh repo create mmx-v2 --public --description "MMX v2 — spec-correct, contract-driven execution engine"
git remote add origin git@github.com:$(gh api user --jq .login)/mmx-v2.git
git push -u origin main
```

---

### Task 30: Final commit

```bash
cd ~/mmx-v2
git add .
git commit -m "feat: mmx-v2 complete — spec-correct rebuild from MMX 2.txt, 8 stages, zero API cost"
git push
```

---

## Summary

| Phase | Tasks | Key deliverables |
|-------|-------|-----------------|
| 1 — Canon | 1–5 | RunCard (13 fields), Paths (all stages), fid8, Three Laws, Contract registry |
| 2 — Enforcement | 6–11 | Event spine (21 types), Artifact validator, Prompt assembler (4-block), State machine, SDK runner, Daemon |
| 3 — Stages | 12–21 | 10 role prompts, Cathedral→HumanGate all 8 stages, Orchestrator |
| 4 — Dashboard | 22–24 | SSE events, Stage spine, Event feed, Artifact browser, AIMS adapter |
| 5 — Verification | 25–30 | Tests pass, builds clean, dryRun e2e, dashboard smoke, GitHub push |
