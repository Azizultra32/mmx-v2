import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import { checkThreeLaws } from './three-laws.js';

const execFile = promisify(execFileCb);
let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-test-'));
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('checkThreeLaws', () => {
  it('passes on a clean git repo', async () => {
    await execFile('git', ['init'], { cwd: tmpDir });
    await execFile('git', ['-c', 'user.email=t@t.com', '-c', 'user.name=T', 'commit', '--allow-empty', '-m', 'init'], { cwd: tmpDir });

    const result = await checkThreeLaws({ enginePath: '/different/path', targetPath: tmpDir });
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails when engine path equals target path', async () => {
    const result = await checkThreeLaws({ enginePath: tmpDir, targetPath: tmpDir });
    expect(result.ok).toBe(false);
    expect(result.violations).toContain('ENGINE_EQUALS_TARGET');
  });

  it('reports dirty files outside .metamatrix', async () => {
    await execFile('git', ['init'], { cwd: tmpDir });
    await execFile('git', ['-c', 'user.email=t@t.com', '-c', 'user.name=T', 'commit', '--allow-empty', '-m', 'init'], { cwd: tmpDir });
    await fs.writeFile(path.join(tmpDir, 'dirty.txt'), 'dirty');

    const result = await checkThreeLaws({ enginePath: '/different/path', targetPath: tmpDir });
    expect(result.ok).toBe(false);
    expect(result.violations).toContain('TARGET_DIRTY');
    expect(result.dirtyPaths).toContain('dirty.txt');
  });

  it('passes when only .metamatrix is dirty', async () => {
    await execFile('git', ['init'], { cwd: tmpDir });
    await execFile('git', ['-c', 'user.email=t@t.com', '-c', 'user.name=T', 'commit', '--allow-empty', '-m', 'init'], { cwd: tmpDir });
    await fs.mkdir(path.join(tmpDir, '.metamatrix'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.metamatrix', 'state.json'), '{}');

    const result = await checkThreeLaws({ enginePath: '/different/path', targetPath: tmpDir });
    expect(result.ok).toBe(true);
  });

  it('flags WORKSPACE_OUTSIDE_TARGET when workspace is outside target', async () => {
    const result = await checkThreeLaws({
      enginePath: '/other',
      targetPath: tmpDir,
      workspacePath: '/completely/different/path',
    });
    expect(result.violations).toContain('WORKSPACE_OUTSIDE_TARGET');
  });
});
