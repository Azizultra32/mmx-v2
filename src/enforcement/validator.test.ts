import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { validateInputs, validateOutputs } from './validator.js';
import type { ArtifactIOItem } from '../core/types.js';

function makeItem(overrides: Partial<ArtifactIOItem>): ArtifactIOItem {
  return {
    handle: 'test-handle',
    path: '/tmp/nonexistent-file.json',
    required: true,
    format: 'json',
    schema_ref: null,
    owner_role: null,
    ...overrides,
  };
}

describe('validateInputs', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-validator-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('passes when required file exists and valid JSON', async () => {
    const filePath = path.join(tmpDir, 'input.json');
    await fs.writeFile(filePath, JSON.stringify({ foo: 'bar' }));

    const item = makeItem({ handle: 'my-input', path: filePath, format: 'json' });
    const result = await validateInputs([item]);

    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails with CONTRACT_BREACH when required file is missing', async () => {
    const filePath = path.join(tmpDir, 'does-not-exist.json');
    const item = makeItem({ handle: 'missing-input', path: filePath, format: 'json' });
    const result = await validateInputs([item]);

    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain('CONTRACT_BREACH');
    expect(result.violations[0]).toContain(`handle="missing-input"`);
    expect(result.violations[0]).toContain(`path="${filePath}"`);
  });

  it('passes when optional file is missing (required: false)', async () => {
    const filePath = path.join(tmpDir, 'optional.json');
    const item = makeItem({ handle: 'optional-input', path: filePath, required: false, format: 'json' });
    const result = await validateInputs([item]);

    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails when JSON file exists but content is invalid JSON', async () => {
    const filePath = path.join(tmpDir, 'bad.json');
    await fs.writeFile(filePath, 'this is not json {{{');

    const item = makeItem({ handle: 'bad-json', path: filePath, format: 'json' });
    const result = await validateInputs([item]);

    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain('CONTRACT_BREACH');
    expect(result.violations[0]).toContain(`handle="bad-json"`);
    expect(result.violations[0]).toContain(`path="${filePath}"`);
  });

  it('passes required non-JSON file that exists (no JSON parse check)', async () => {
    const filePath = path.join(tmpDir, 'notes.md');
    await fs.writeFile(filePath, '# Hello World');

    const item = makeItem({ handle: 'md-input', path: filePath, format: 'markdown' });
    const result = await validateInputs([item]);

    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

describe('validateOutputs', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-validator-out-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('passes when required output file exists and valid JSON', async () => {
    const filePath = path.join(tmpDir, 'output.json');
    await fs.writeFile(filePath, JSON.stringify({ result: 42 }));

    const item = makeItem({ handle: 'my-output', path: filePath, format: 'json' });
    const result = await validateOutputs([item]);

    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails with CONTRACT_BREACH when required output file is missing', async () => {
    const filePath = path.join(tmpDir, 'missing-output.json');
    const item = makeItem({ handle: 'missing-output', path: filePath, format: 'json' });
    const result = await validateOutputs([item]);

    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain('CONTRACT_BREACH');
    expect(result.violations[0]).toContain(`handle="missing-output"`);
    expect(result.violations[0]).toContain(`path="${filePath}"`);
  });

  it('passes when optional output file is missing (required: false)', async () => {
    const filePath = path.join(tmpDir, 'optional-out.json');
    const item = makeItem({ handle: 'optional-out', path: filePath, required: false, format: 'json' });
    const result = await validateOutputs([item]);

    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails when output JSON file exists but content is invalid JSON', async () => {
    const filePath = path.join(tmpDir, 'bad-out.json');
    await fs.writeFile(filePath, '{ broken json');

    const item = makeItem({ handle: 'bad-out-json', path: filePath, format: 'json' });
    const result = await validateOutputs([item]);

    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain('CONTRACT_BREACH');
    expect(result.violations[0]).toContain(`handle="bad-out-json"`);
  });
});
