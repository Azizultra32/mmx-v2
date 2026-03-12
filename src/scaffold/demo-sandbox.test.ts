import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createDemoSandbox } from './demo-sandbox.js';

describe('createDemoSandbox', () => {
  let sandboxPath: string;

  afterEach(async () => {
    if (sandboxPath) await fs.rm(sandboxPath, { recursive: true, force: true }).catch(() => {});
  });

  it('creates sandbox with source files and .mmx/target.json', async () => {
    sandboxPath = path.join(os.tmpdir(), `mmx-test-sandbox-${Date.now()}`);
    const result = await createDemoSandbox({ basePath: sandboxPath });

    expect(result.targetPath).toBe(sandboxPath);
    expect(result.fileCount).toBeGreaterThan(0);

    // Check .mmx/target.json exists
    const targetJson = JSON.parse(await fs.readFile(path.join(sandboxPath, '.mmx', 'target.json'), 'utf8'));
    expect(targetJson.source_type).toBe('demo');
    expect(targetJson.display_name).toBe('Demo Sandbox');

    // Check source files exist
    const authFile = await fs.readFile(path.join(sandboxPath, 'src', 'auth.ts'), 'utf8');
    expect(authFile).toContain('authenticate');

    // Check git repo was initialized
    const gitDir = path.join(sandboxPath, '.git');
    await expect(fs.access(gitDir)).resolves.not.toThrow();
  });
});
