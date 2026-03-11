import { describe, it, expect } from 'vitest';
import { buildRunnerOptions, COMPLETION_SIGNAL } from './sdk-runner.js';

describe('COMPLETION_SIGNAL', () => {
  it('is AUTONOMOUS_COMPLETE', () => {
    expect(COMPLETION_SIGNAL).toBe('AUTONOMOUS_COMPLETE');
  });
});

describe('buildRunnerOptions', () => {
  it('never includes apiKey', () => {
    const opts = buildRunnerOptions({ model: 'claude-opus-4-6', systemPrompt: 'Do work.', maxTurns: 10 });
    expect(opts).not.toHaveProperty('apiKey');
    expect(opts.model).toBe('claude-opus-4-6');
    expect(opts.maxTurns).toBe(10);
  });

  it('injects completion signal into system prompt', () => {
    const opts = buildRunnerOptions({ model: 'claude-sonnet-4-6', systemPrompt: 'Do work.', maxTurns: 5 });
    expect(opts.system).toContain(COMPLETION_SIGNAL);
    expect(opts.system).toContain('Do work.');
  });

  it('uses provided model', () => {
    const opts = buildRunnerOptions({ model: 'claude-haiku-4-5', systemPrompt: 'test', maxTurns: 3 });
    expect(opts.model).toBe('claude-haiku-4-5');
  });
});
