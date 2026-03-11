import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { initRun, readRunState, writeRunState, transitionState, listRunIds } from './machine.js';

let tmpDir: string;
beforeEach(async () => { tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-state-')); });
afterEach(async () => { await fs.rm(tmpDir, { recursive: true, force: true }); });

describe('initRun', () => {
  it('creates run dir and writes INITIALIZED state', async () => {
    const state = await initRun(tmpDir, 'mmx-test', 1);
    expect(state.state).toBe('INITIALIZED');
    expect(state.runId).toBe('mmx-test');
    expect(state.level).toBe(1);
    expect(state.version).toBe('2.0');
  });

  it('persists state to disk', async () => {
    await initRun(tmpDir, 'mmx-persist', 2);
    const loaded = await readRunState(tmpDir, 'mmx-persist');
    expect(loaded).not.toBeNull();
    expect(loaded!.state).toBe('INITIALIZED');
    expect(loaded!.level).toBe(2);
  });
});

describe('transitionState', () => {
  it('transitions INITIALIZED -> CATHEDRALED', async () => {
    await initRun(tmpDir, 'mmx-t', 1);
    const updated = await transitionState(tmpDir, 'mmx-t', 'CATHEDRALED');
    expect(updated.state).toBe('CATHEDRALED');
    const loaded = await readRunState(tmpDir, 'mmx-t');
    expect(loaded!.state).toBe('CATHEDRALED');
  });

  it('sets completedAt on FAILED', async () => {
    await initRun(tmpDir, 'mmx-f', 1);
    const updated = await transitionState(tmpDir, 'mmx-f', 'FAILED', 'something broke');
    expect(updated.state).toBe('FAILED');
    expect(updated.error).toBe('something broke');
    expect(updated.completedAt).toBeDefined();
  });

  it('sets completedAt on COMPLETE', async () => {
    await initRun(tmpDir, 'mmx-c', 1);
    const updated = await transitionState(tmpDir, 'mmx-c', 'COMPLETE');
    expect(updated.completedAt).toBeDefined();
  });

  it('throws if run does not exist', async () => {
    await expect(transitionState(tmpDir, 'nonexistent', 'FAILED')).rejects.toThrow();
  });
});

describe('listRunIds', () => {
  it('returns empty array when no runs exist', async () => {
    const ids = await listRunIds(tmpDir);
    expect(ids).toEqual([]);
  });

  it('returns run ids sorted newest first', async () => {
    await initRun(tmpDir, 'mmx-a', 1);
    await initRun(tmpDir, 'mmx-b', 1);
    const ids = await listRunIds(tmpDir);
    expect(ids).toContain('mmx-a');
    expect(ids).toContain('mmx-b');
  });
});
