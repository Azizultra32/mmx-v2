import { describe, it, expect } from 'vitest';
import { buildPromptOptions, COMPLETION_SIGNAL, DEFAULT_MODEL } from './sdk-runner.js';

describe('SDK runner', () => {
  it('COMPLETION_SIGNAL is defined', () => {
    expect(COMPLETION_SIGNAL).toBe('AUTONOMOUS_COMPLETE');
  });

  it('DEFAULT_MODEL is claude-opus-4-6', () => {
    expect(DEFAULT_MODEL).toBe('claude-opus-4-6');
  });

  it('buildPromptOptions does not include apiKey', () => {
    const opts = buildPromptOptions({ model: 'claude-opus-4-6', systemPrompt: 'test', maxTurns: 10 });
    expect('apiKey' in opts).toBe(false);
    expect(opts.model).toBe('claude-opus-4-6');
    expect(opts.maxTurns).toBe(10);
  });

  it('appends AUTONOMOUS_COMPLETE instruction to systemPrompt', () => {
    const opts = buildPromptOptions({ model: 'claude-opus-4-6', systemPrompt: 'sys', maxTurns: 5 });
    expect(opts.systemPrompt).toContain('AUTONOMOUS_COMPLETE');
    expect(opts.systemPrompt).toContain('sys');
  });
});
