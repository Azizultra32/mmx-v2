import { describe, it, expect } from 'vitest';
import { createRunCard, validateRunCard } from './run-card.js';

describe('createRunCard', () => {
  it('creates a valid run-card with required fields', () => {
    const card = createRunCard({
      targetPath: '/some/repo',
      workspacePath: '/some/repo/.metamatrix',
      stage: 'cathedral',
      level: 1,
      budgetUsd: 2.0,
    });
    expect(card.runId).toMatch(/^mmx-/);
    expect(card.stage).toBe('cathedral');
    expect(card.level).toBe(1);
    expect(card.timeoutMs).toBe(300_000);
    expect(card.inputs).toEqual({});
    expect(card.outputs).toEqual({});
  });

  it('generates unique runIds', () => {
    const a = createRunCard({ targetPath: '/r', workspacePath: '/r/.m', stage: 'find', level: 1, budgetUsd: 1 });
    const b = createRunCard({ targetPath: '/r', workspacePath: '/r/.m', stage: 'find', level: 1, budgetUsd: 1 });
    expect(a.runId).not.toBe(b.runId);
  });

  it('accepts custom timeoutMs', () => {
    const card = createRunCard({ targetPath: '/r', workspacePath: '/r/.m', stage: 'cathedral', level: 1, budgetUsd: 1, timeoutMs: 60_000 });
    expect(card.timeoutMs).toBe(60_000);
  });
});

describe('validateRunCard', () => {
  it('passes a valid card', () => {
    const card = createRunCard({ targetPath: '/r', workspacePath: '/r/.m', stage: 'find', level: 2, budgetUsd: 5.0 });
    expect(validateRunCard(card).valid).toBe(true);
  });

  it('rejects negative budget', () => {
    const card = createRunCard({ targetPath: '/r', workspacePath: '/r/.m', stage: 'cathedral', level: 1, budgetUsd: -1 });
    const result = validateRunCard(card);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('budget must be positive');
  });

  it('rejects level 0', () => {
    const card = createRunCard({ targetPath: '/r', workspacePath: '/r/.m', stage: 'cathedral', level: 0, budgetUsd: 1 });
    const result = validateRunCard(card);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('level must be >= 1');
  });
});
