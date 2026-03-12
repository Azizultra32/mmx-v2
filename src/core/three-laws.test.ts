import { describe, it, expect } from 'vitest';
import { enforceLaws } from './three-laws.js';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

describe('Three Laws', () => {
  it('throws ENGINE_EQUALS_TARGET when paths match', async () => {
    await expect(enforceLaws({ enginePath: '/same/path', targetPath: '/same/path' }))
      .rejects.toThrow('ENGINE_EQUALS_TARGET');
  });

  it('throws WORKSPACE_OUTSIDE_TARGET when workspace not under .mmx', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-law-'));
    await expect(enforceLaws({ enginePath: '/engine', targetPath: tmpDir, workspacePath: '/outside' }))
      .rejects.toThrow('WORKSPACE_OUTSIDE_TARGET');
  });

  it('passes when workspace is inside .mmx', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-law-'));
    const workspace = path.join(tmpDir, '.mmx', 'runs', 'run-001');
    await expect(enforceLaws({ enginePath: '/engine', targetPath: tmpDir, workspacePath: workspace }))
      .resolves.toBeUndefined();
  });

  it('passes when enginePath and targetPath differ', async () => {
    await expect(enforceLaws({ enginePath: '/engine', targetPath: '/target' }))
      .resolves.toBeUndefined();
  });
});
