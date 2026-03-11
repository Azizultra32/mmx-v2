import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { runFind } from '../find/index.js';
import { runDistill } from '../distill/index.js';
import { runPredict } from '../predict/index.js';
import { runPropose } from '../propose/index.js';
import { runImplement } from './index.js';
import { Paths } from '../../core/paths.js';

describe('runImplement (dryRun)', () => {
  let tmpDir: string;
  const runId = 'mmx-test06';

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-implement-'));
    await runFind({ targetPath: tmpDir, runId, level: 1, dryRun: true });
    await runDistill({ targetPath: tmpDir, runId, dryRun: true });
    await runPredict({ targetPath: tmpDir, runId, dryRun: true });
    await runPropose({ targetPath: tmpDir, runId, dryRun: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates patch, tests, facts, approved for each finding', async () => {
    const result = await runImplement({ targetPath: tmpDir, runId, dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.stage).toBe('implement');

    const paths = new Paths(tmpDir, runId);
    const matrixRaw = await fs.readFile(paths.find.convergenceMatrix, 'utf-8');
    const matrix = JSON.parse(matrixRaw);

    for (const f of matrix.findings) {
      await expect(fs.access(paths.implement.patch(f.fid8, 1))).resolves.toBeUndefined();
      await expect(fs.access(paths.implement.tests(f.fid8, 1))).resolves.toBeUndefined();
      await expect(fs.access(paths.implement.facts(f.fid8, 1))).resolves.toBeUndefined();
      await expect(fs.access(paths.implement.approved(f.fid8))).resolves.toBeUndefined();
    }
  });
});
