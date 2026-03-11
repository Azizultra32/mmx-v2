import { describe, it, expect } from 'vitest';
import { AimsAdapter, createAimsAdapter } from './adapter.js';

describe('AimsAdapter', () => {
  it('does not throw when AIMS is unreachable', async () => {
    const adapter = new AimsAdapter({ baseUrl: 'http://localhost:19999', apiKey: 'test' });
    await expect(adapter.register({ runId: 'test', targetPath: '/tmp' })).resolves.not.toThrow();
  });

  it('returns offline:true when AIMS unreachable', async () => {
    const adapter = new AimsAdapter({ baseUrl: 'http://localhost:19999', apiKey: 'test' });
    const result = await adapter.register({ runId: 'test', targetPath: '/tmp' });
    expect(result.offline).toBe(true);
    expect(result.ok).toBe(false);
  });

  it('all 7 methods return AimsResult shape when offline', async () => {
    const adapter = new AimsAdapter({ baseUrl: 'http://localhost:19999', apiKey: 'test' });
    const results = await Promise.all([
      adapter.register({ runId: 'r', targetPath: '/t' }),
      adapter.heartbeat({ runId: 'r', status: 'running' }),
      adapter.taskUpdate({ runId: 'r', stage: 'cathedral', status: 'complete' }),
      adapter.blocker({ runId: 'r', reason: 'stuck' }),
      adapter.planSignal({ runId: 'r', signal: 'replan' }),
      adapter.spawnRequest({ runId: 'r', role: 'worker', task: 'do thing' }),
      adapter.directive({ runId: 'r' }),
    ]);
    for (const result of results) {
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('offline');
      expect(result.offline).toBe(true);
    }
  });
});

describe('createAimsAdapter', () => {
  it('returns null when env vars not set', () => {
    delete process.env.AIMS_URL;
    delete process.env.AIMS_API_KEY;
    expect(createAimsAdapter()).toBeNull();
  });

  it('returns adapter when both env vars set', () => {
    process.env.AIMS_URL = 'http://localhost:3000';
    process.env.AIMS_API_KEY = 'test-key';
    const adapter = createAimsAdapter();
    expect(adapter).not.toBeNull();
    delete process.env.AIMS_URL;
    delete process.env.AIMS_API_KEY;
  });
});
