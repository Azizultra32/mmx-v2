import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { runFind } from './index.js';
import { Paths } from '../../core/paths.js';

describe('runFind (dryRun)', () => {
  let tmpDir: string;
  const runId = 'mmx-test02';

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-find-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('produces convergence-matrix.json with 2 entries', async () => {
    const result = await runFind({ targetPath: tmpDir, runId, level: 1, dryRun: true });

    expect(result.ok).toBe(true);
    expect(result.stage).toBe('find');

    const paths = new Paths(tmpDir, runId);
    const raw = await fs.readFile(paths.find.convergenceMatrix, 'utf-8');
    const matrix = JSON.parse(raw);

    expect(matrix.run_id).toBe(runId);
    expect(Array.isArray(matrix.findings)).toBe(true);
    expect(matrix.findings.length).toBe(2);
    for (const f of matrix.findings) {
      expect(typeof f.fid8).toBe('string');
      expect(f.fid8.length).toBe(8);
      expect(f.status).toBe('converged');
    }
  });

  it('creates raw, merged, convergence files for each finding', async () => {
    const result = await runFind({ targetPath: tmpDir, runId, level: 1, dryRun: true });
    expect(result.ok).toBe(true);

    const paths = new Paths(tmpDir, runId);
    const matrixRaw = await fs.readFile(paths.find.convergenceMatrix, 'utf-8');
    const matrix = JSON.parse(matrixRaw);

    for (const f of matrix.findings) {
      const rawPath = paths.find.raw(f.fid8);
      const mergedPath = paths.find.merged(f.fid8);
      const convergencePath = paths.find.convergence(f.fid8);

      await expect(fs.access(rawPath)).resolves.toBeUndefined();
      await expect(fs.access(mergedPath)).resolves.toBeUndefined();
      await expect(fs.access(convergencePath)).resolves.toBeUndefined();
    }
  });
});
