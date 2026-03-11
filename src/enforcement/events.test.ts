import { describe, it, expect, beforeEach } from 'vitest';
import { EventSpine } from './events.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

describe('EventSpine', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-events-'));
  });

  it('appends event as JSONL with timestamp', async () => {
    const spine = new EventSpine(path.join(tmpDir, 'activity.jsonl'));
    await spine.emit({ event_type: 'RUN_CREATED', run_id: 'mmx-test', agent_id: null, stage: null });
    const lines = (await fs.readFile(spine.filePath, 'utf-8')).trim().split('\n');
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.event_type).toBe('RUN_CREATED');
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(parsed.run_id).toBe('mmx-test');
  });

  it('creates parent directories automatically', async () => {
    const spine = new EventSpine(path.join(tmpDir, 'deep', 'nested', 'activity.jsonl'));
    await spine.emit({ event_type: 'UNIT_COMPLETE', run_id: 'x', agent_id: null, stage: null });
    expect(await fs.access(spine.filePath).then(() => true).catch(() => false)).toBe(true);
  });

  it('appends multiple events', async () => {
    const spine = new EventSpine(path.join(tmpDir, 'activity.jsonl'));
    await spine.emit({ event_type: 'RUN_CREATED', run_id: 'r1', agent_id: null, stage: null });
    await spine.emit({ event_type: 'DISPATCH_STARTED', run_id: 'r1', agent_id: 'agent-1', stage: 'cathedral' });
    const all = await spine.readAll();
    expect(all).toHaveLength(2);
    expect(all[1].event_type).toBe('DISPATCH_STARTED');
  });
});
