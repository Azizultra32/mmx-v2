import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { runCathedral } from './cathedral.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-cath-'));
  await fs.writeFile(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({ name: 'test-repo', version: '1.0.0', dependencies: { lodash: '^4.0.0' } }),
  );
  await fs.writeFile(path.join(tmpDir, 'index.ts'), 'export const foo = 1;');
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('runCathedral', () => {
  it('returns cathedral stage result with correct fields', async () => {
    const result = await runCathedral({
      targetPath: tmpDir,
      runId: 'mmx-test',
      level: 1,
      dryRun: true,
    });
    expect(result.stage).toBe('cathedral');
    expect(result.runId).toBe('mmx-test');
    expect(result.ok).toBe(true);
    expect(result.costUsd).toBe(0);
  });

  it('dryRun creates schematic file on disk', async () => {
    const result = await runCathedral({
      targetPath: tmpDir,
      runId: 'mmx-dry',
      level: 1,
      dryRun: true,
    });
    const raw = await fs.readFile(result.outputPaths.schematic, 'utf-8');
    const schematic = JSON.parse(raw);
    expect(schematic.repo).toBe(tmpDir);
    expect(schematic.mappedAt).toBeDefined();
  });

  it('dryRun creates output dir under .metamatrix/runs/<runId>/cathedral/', async () => {
    const result = await runCathedral({
      targetPath: tmpDir,
      runId: 'mmx-dir-test',
      level: 1,
      dryRun: true,
    });
    const expectedDir = path.join(tmpDir, '.metamatrix', 'runs', 'mmx-dir-test', 'cathedral');
    await expect(fs.access(expectedDir)).resolves.not.toThrow();
    expect(result.outputPaths.schematic).toContain(expectedDir);
  });
});
