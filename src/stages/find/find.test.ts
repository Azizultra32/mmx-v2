import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { createHash } from 'node:crypto';
import { runFind } from './index.js';
import { Paths } from '../../core/paths.js';

describe('runFind (dryRun)', () => {
  let tmpDir: string;
  const runId = 'mmx-test02';

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-find-'));
    // Cathedral must run before find — write cathedral schematics
    const paths = new Paths(tmpDir, runId);
    await fs.mkdir(path.dirname(paths.cathedral.schematics), { recursive: true });
    await fs.writeFile(
      paths.cathedral.schematics,
      JSON.stringify({
        run_id: runId,
        subsystems: [],
        source_refs: [],
        generated_at: new Date().toISOString(),
      }, null, 2),
      'utf-8',
    );
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
    expect(matrix.cathedral_run_id).toBe(runId);
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

  it('generates deterministic fid8s derived from runId', async () => {
    const result = await runFind({ targetPath: tmpDir, runId, level: 1, dryRun: true });
    expect(result.ok).toBe(true);

    // fid8s must be deterministic: sha256(runId-stub-N).slice(0,8)
    const expectedFid8s = [0, 1].map(i =>
      createHash('sha256').update(`${runId}-stub-${i}`).digest('hex').slice(0, 8)
    );

    const paths = new Paths(tmpDir, runId);
    const matrixRaw = await fs.readFile(paths.find.convergenceMatrix, 'utf-8');
    const matrix = JSON.parse(matrixRaw);
    const actualFid8s = matrix.findings.map((f: { fid8: string }) => f.fid8);

    expect(actualFid8s).toEqual(expectedFid8s);
  });

  it('raw findings contain cathedral_run_id provenance', async () => {
    const result = await runFind({ targetPath: tmpDir, runId, level: 1, dryRun: true });
    expect(result.ok).toBe(true);

    const paths = new Paths(tmpDir, runId);
    const matrixRaw = await fs.readFile(paths.find.convergenceMatrix, 'utf-8');
    const matrix = JSON.parse(matrixRaw);

    for (const f of matrix.findings) {
      const rawContent = await fs.readFile(paths.find.raw(f.fid8), 'utf-8');
      const rawFinding = JSON.parse(rawContent);
      expect(rawFinding.cathedral_run_id).toBe(runId);
    }
  });

  it('hard fails with INPUT_VALIDATION_FAILED when cathedral schematics are missing', async () => {
    // Remove cathedral schematics
    const paths = new Paths(tmpDir, runId);
    await fs.rm(paths.cathedral.schematics, { force: true });

    const result = await runFind({ targetPath: tmpDir, runId: 'no-cathedral', level: 1, dryRun: true });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/INPUT_VALIDATION_FAILED/);
  });
});
