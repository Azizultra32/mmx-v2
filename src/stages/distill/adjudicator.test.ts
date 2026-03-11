import { describe, it, expect } from 'vitest';
import { adjudicate } from './adjudicator.js';

describe('adjudicate', () => {
  it('returns reject when weakens >= 4', () => {
    const votes = [
      { supports: false, weakens: true },
      { supports: false, weakens: true },
      { supports: false, weakens: true },
      { supports: false, weakens: true },
      { supports: true, weakens: false },
    ];
    const result = adjudicate(votes);
    expect(result.verdict).toBe('reject');
    expect(result.confidence).toBe(4 / 5);
  });

  it('returns reject when weakens exactly 4', () => {
    const votes = [
      { supports: false, weakens: true },
      { supports: false, weakens: true },
      { supports: false, weakens: true },
      { supports: false, weakens: true },
    ];
    const result = adjudicate(votes);
    expect(result.verdict).toBe('reject');
    expect(result.confidence).toBe(1.0);
  });

  it('returns approve when supports >= 3 and weakens < 4', () => {
    const votes = [
      { supports: true, weakens: false },
      { supports: true, weakens: false },
      { supports: true, weakens: false },
      { supports: false, weakens: false },
    ];
    const result = adjudicate(votes);
    expect(result.verdict).toBe('approve');
    expect(result.confidence).toBe(3 / 4);
  });

  it('returns needs_revision when neither threshold met', () => {
    const votes = [
      { supports: true, weakens: false },
      { supports: false, weakens: true },
    ];
    const result = adjudicate(votes);
    expect(result.verdict).toBe('needs_revision');
    expect(result.confidence).toBe(0.5);
  });

  it('reject takes precedence over approve when both thresholds could be met', () => {
    // 4 weakens + 3 supports in same set — reject wins because weakens checked first
    const votes = [
      { supports: true, weakens: true },
      { supports: true, weakens: true },
      { supports: true, weakens: true },
      { supports: false, weakens: true },
    ];
    const result = adjudicate(votes);
    expect(result.verdict).toBe('reject');
  });
});
