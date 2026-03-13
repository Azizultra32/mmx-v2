import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { runCathedral } from './index.js';
import { Paths } from '../../core/paths.js';

describe('runCathedral (dryRun)', () => {
  let tmpDir: string;
  const runId = 'mmx-test01';

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-cathedral-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates brief.md and schematics/index.json', async () => {
    const result = await runCathedral({ targetPath: tmpDir, runId, level: 1, dryRun: true });

    expect(result.ok).toBe(true);
    expect(result.stage).toBe('cathedral');
    expect(result.costUsd).toBe(0);

    const paths = new Paths(tmpDir, runId);
    const brief = await fs.readFile(paths.cathedral.brief, 'utf-8');
    expect(brief).toContain('Cathedral Brief');
    expect(brief).toContain(runId);

    const schematics = await fs.readFile(paths.cathedral.schematics, 'utf-8');
    const schema = JSON.parse(schematics);
    expect(schema.run_id).toBe(runId);
    expect(schema.stage).toBe('cathedral');
    expect(Array.isArray(schema.subsystems)).toBe(true);
    expect(Array.isArray(schema.source_refs)).toBe(true);
    expect(typeof schema.generated_at).toBe('string');
  });

  it('returns correct outputPaths', async () => {
    const paths = new Paths(tmpDir, runId);
    const result = await runCathedral({ targetPath: tmpDir, runId, level: 1, dryRun: true });

    expect(result.outputPaths.brief).toBe(paths.cathedral.brief);
    expect(result.outputPaths.schematics).toBe(paths.cathedral.schematics);
  });
});
