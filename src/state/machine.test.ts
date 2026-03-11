import { describe, it, expect, beforeEach } from 'vitest';
import { RunRegistry } from './machine.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

describe('RunRegistry', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-reg-'));
  });

  it('initializes with pending state', async () => {
    const reg = new RunRegistry(tmpDir, 'mmx-test1');
    await reg.init({ level: 1 });
    const state = await reg.read();
    expect(state.run_id).toBe('mmx-test1');
    expect(state.state).toBe('pending');
    expect(state.level).toBe(1);
    expect(state.total_cost_usd).toBe(0);
  });

  it('transitions state', async () => {
    const reg = new RunRegistry(tmpDir, 'mmx-test2');
    await reg.init({ level: 1 });
    await reg.transition('running', { stage: 'cathedral' });
    const state = await reg.read();
    expect(state.state).toBe('running');
    expect(state.active_stage).toBe('cathedral');
  });

  it('accumulates cost', async () => {
    const reg = new RunRegistry(tmpDir, 'mmx-test3');
    await reg.init({ level: 1 });
    await reg.transition('running', { costUsd: 0.05 });
    await reg.transition('complete', { costUsd: 0.10 });
    const state = await reg.read();
    expect(state.total_cost_usd).toBeCloseTo(0.15);
    expect(state.completed_at).not.toBeNull();
  });
});
