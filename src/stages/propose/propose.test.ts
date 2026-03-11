import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { runFind } from '../find/index.js';
import { runDistill } from '../distill/index.js';
import { runPredict } from '../predict/index.js';
import { runPropose } from './index.js';
import { Paths } from '../../core/paths.js';

describe('runPropose (dryRun)', () => {
  let tmpDir: string;
  const runId = 'mmx-test05';

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-propose-'));
    await runFind({ targetPath: tmpDir, runId, level: 1, dryRun: true });
    await runDistill({ targetPath: tmpDir, runId, dryRun: true });
    await runPredict({ targetPath: tmpDir, runId, dryRun: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates proposal and approved packet for each finding', async () => {
    const result = await runPropose({ targetPath: tmpDir, runId, dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.stage).toBe('propose');

    const paths = new Paths(tmpDir, runId);
    const matrixRaw = await fs.readFile(paths.find.convergenceMatrix, 'utf-8');
    const matrix = JSON.parse(matrixRaw);

    for (const f of matrix.findings) {
      await expect(fs.access(paths.propose.proposal(f.fid8, 'a'))).resolves.toBeUndefined();
      await expect(fs.access(paths.propose.approved(f.fid8, 'a'))).resolves.toBeUndefined();
    }
  });
});
