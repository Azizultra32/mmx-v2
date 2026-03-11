import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { runDistill } from './index.js';
import { runFind } from '../find/index.js';
import { Paths } from '../../core/paths.js';

describe('runDistill (dryRun)', () => {
  let tmpDir: string;
  const runId = 'mmx-test03';

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-distill-'));
    // Distill requires find's convergence-matrix.json
    await runFind({ targetPath: tmpDir, runId, level: 1, dryRun: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates verdict, challenge, and approved files for each finding', async () => {
    const result = await runDistill({ targetPath: tmpDir, runId, dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.stage).toBe('distill');

    const paths = new Paths(tmpDir, runId);
    const matrixRaw = await fs.readFile(paths.find.convergenceMatrix, 'utf-8');
    const matrix = JSON.parse(matrixRaw);

    for (const f of matrix.findings) {
      await expect(fs.access(paths.distill.verdict(f.fid8))).resolves.toBeUndefined();
      await expect(fs.access(paths.distill.challenge(f.fid8))).resolves.toBeUndefined();
      await expect(fs.access(paths.distill.approved(f.fid8))).resolves.toBeUndefined();
    }
  });

  it('fails if convergence-matrix.json is missing', async () => {
    const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-nodistill-'));
    try {
      const result = await runDistill({ targetPath: emptyDir, runId: 'mmx-nodata', dryRun: true });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('INPUT_VALIDATION_FAILED');
    } finally {
      await fs.rm(emptyDir, { recursive: true, force: true });
    }
  });
});
