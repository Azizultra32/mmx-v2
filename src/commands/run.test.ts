import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

// We test the orchestration by running all 8 stages inline with dryRun
import { runCathedral } from '../stages/cathedral/index.js';
import { runFind } from '../stages/find/index.js';
import { runDistill } from '../stages/distill/index.js';
import { runPredict } from '../stages/predict/index.js';
import { runPropose } from '../stages/propose/index.js';
import { runImplement } from '../stages/implement/index.js';
import { runFinalGuard } from '../stages/finalguard/index.js';
import { runHumanGate } from '../stages/humangate/index.js';
import { RunRegistry } from '../state/machine.js';

describe('full pipeline dryRun', () => {
  let tmpDir: string;
  const runId = 'mmx-pipe01';

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-pipeline-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('all 8 stages complete successfully', async () => {
    const stageOpts = { targetPath: tmpDir, runId, level: 1, dryRun: true };

    const registry = new RunRegistry(tmpDir, runId);
    await registry.init({ level: 1, targetPath: tmpDir });

    const r1 = await runCathedral(stageOpts);
    expect(r1.ok).toBe(true);

    const r2 = await runFind(stageOpts);
    expect(r2.ok).toBe(true);

    const r3 = await runDistill({ targetPath: tmpDir, runId, dryRun: true });
    expect(r3.ok).toBe(true);

    const r4 = await runPredict({ targetPath: tmpDir, runId, dryRun: true });
    expect(r4.ok).toBe(true);

    const r5 = await runPropose({ targetPath: tmpDir, runId, dryRun: true });
    expect(r5.ok).toBe(true);

    const r6 = await runImplement({ targetPath: tmpDir, runId, dryRun: true });
    expect(r6.ok).toBe(true);

    const r7 = await runFinalGuard({ targetPath: tmpDir, runId, dryRun: true });
    expect(r7.ok).toBe(true);

    const r8 = await runHumanGate({ targetPath: tmpDir, runId, dryRun: true });
    expect(r8.ok).toBe(true);

    // Final registry state
    await registry.transition('complete');
    const state = await registry.read();
    expect(state.state).toBe('complete');
  });
});
