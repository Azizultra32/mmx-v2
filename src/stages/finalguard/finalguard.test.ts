import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { runFind } from '../find/index.js';
import { runDistill } from '../distill/index.js';
import { runPredict } from '../predict/index.js';
import { runPropose } from '../propose/index.js';
import { runImplement } from '../implement/index.js';
import { runFinalGuard } from './index.js';
import { Paths } from '../../core/paths.js';

describe('runFinalGuard (dryRun)', () => {
  let tmpDir: string;
  const runId = 'mmx-test07';

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-finalguard-'));
    await runFind({ targetPath: tmpDir, runId, level: 1, dryRun: true });
    await runDistill({ targetPath: tmpDir, runId, dryRun: true });
    await runPredict({ targetPath: tmpDir, runId, dryRun: true });
    await runPropose({ targetPath: tmpDir, runId, dryRun: true });
    await runImplement({ targetPath: tmpDir, runId, dryRun: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates verdict (approve), notes, receipt for each finding', async () => {
    const result = await runFinalGuard({ targetPath: tmpDir, runId, dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.stage).toBe('finalguard');

    const paths = new Paths(tmpDir, runId);
    const matrixRaw = await fs.readFile(paths.find.convergenceMatrix, 'utf-8');
    const matrix = JSON.parse(matrixRaw);

    for (const f of matrix.findings) {
      const verdictRaw = await fs.readFile(paths.finalguard.verdict(f.fid8), 'utf-8');
      const verdict = JSON.parse(verdictRaw);
      expect(verdict.verdict).toBe('approve');

      await expect(fs.access(paths.finalguard.notes(f.fid8))).resolves.toBeUndefined();
      await expect(fs.access(paths.finalguard.receipt(f.fid8))).resolves.toBeUndefined();
    }
  });
});
