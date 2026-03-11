import { describe, it, expect } from 'vitest';
import {
  CORE_MICRO_SKILL,
  estimateTokens,
  assemblePrompt,
} from './prompt-assembler.js';

describe('CORE_MICRO_SKILL', () => {
  it('contains INPUT_CONTRACT_BREACH_STOP', () => {
    expect(CORE_MICRO_SKILL).toContain('INPUT_CONTRACT_BREACH_STOP');
  });

  it('contains OUTPUT_CONTRACT_BREACH_STOP', () => {
    expect(CORE_MICRO_SKILL).toContain('OUTPUT_CONTRACT_BREACH_STOP');
  });
});

describe('estimateTokens', () => {
  it('returns a small number for a short string', () => {
    const result = estimateTokens('hello world');
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(10);
  });

  it('uses ~4 chars per token (ceil)', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
    expect(estimateTokens('')).toBe(0);
  });
});

describe('assemblePrompt', () => {
  const base = {
    roleSkill: 'You are a summarizer.',
    runCard: 'Summarize the payload.',
    payload: 'The quick brown fox.',
    tokenBudget: 10000,
  };

  it('returns ok:true when under budget', () => {
    const result = assemblePrompt(base);
    expect(result.ok).toBe(true);
    expect(result.prompt).toBeDefined();
    expect(result.estimatedTokens).toBeDefined();
  });

  it('assembled prompt has blocks in correct order', () => {
    const result = assemblePrompt(base);
    expect(result.ok).toBe(true);
    const p = result.prompt!;
    const idxCore = p.indexOf('## CORE_MICRO_SKILL');
    const idxRole = p.indexOf('## ROLE_SKILL');
    const idxRun = p.indexOf('## RUN_CARD');
    const idxPayload = p.indexOf('## PAYLOAD');
    expect(idxCore).toBeGreaterThanOrEqual(0);
    expect(idxRole).toBeGreaterThan(idxCore);
    expect(idxRun).toBeGreaterThan(idxRole);
    expect(idxPayload).toBeGreaterThan(idxRun);
  });

  it('prompt contains roleSkill, runCard, and payload content', () => {
    const result = assemblePrompt(base);
    expect(result.prompt).toContain(base.roleSkill);
    expect(result.prompt).toContain(base.runCard);
    expect(result.prompt).toContain(base.payload);
  });

  it('returns PROMPT_BUDGET_EXCEEDED when over budget', () => {
    const result = assemblePrompt({ ...base, tokenBudget: 1 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('PROMPT_BUDGET_EXCEEDED');
    expect(result.estimatedTokens).toBeDefined();
  });

  it('prompt embeds CORE_MICRO_SKILL verbatim', () => {
    const result = assemblePrompt(base);
    expect(result.prompt).toContain(CORE_MICRO_SKILL);
  });
});
