import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { runFind } from '../find/index.js';
import { runDistill } from '../distill/index.js';
import { runPredict } from './index.js';
import { Paths } from '../../core/paths.js';

describe('runPredict (dryRun)', () => {
  let tmpDir: string;
  const runId = 'mmx-test04';

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-predict-'));
    await runFind({ targetPath: tmpDir, runId, level: 1, dryRun: true });
    await runDistill({ targetPath: tmpDir, runId, dryRun: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates da, fsm, g5, simverify, approved for each finding', async () => {
    const result = await runPredict({ targetPath: tmpDir, runId, dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.stage).toBe('predict');

    const paths = new Paths(tmpDir, runId);
    const matrixRaw = await fs.readFile(paths.find.convergenceMatrix, 'utf-8');
    const matrix = JSON.parse(matrixRaw);

    for (const f of matrix.findings) {
      await expect(fs.access(paths.predict.da(f.fid8))).resolves.toBeUndefined();
      await expect(fs.access(paths.predict.fsm(f.fid8))).resolves.toBeUndefined();
      await expect(fs.access(paths.predict.g5(f.fid8))).resolves.toBeUndefined();
      await expect(fs.access(paths.predict.simverify(f.fid8))).resolves.toBeUndefined();
      await expect(fs.access(paths.predict.approved(f.fid8))).resolves.toBeUndefined();
    }
  });
});
