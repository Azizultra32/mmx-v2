import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HangDetector, backoffMs, withRetry } from './daemon.js';

describe('HangDetector', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts not hanging', () => {
    const d = new HangDetector({ timeoutMs: 1000 });
    d.start();
    expect(d.isHanging()).toBe(false);
  });

  it('detects hang after timeout', () => {
    const d = new HangDetector({ timeoutMs: 1000 });
    d.start();
    vi.advanceTimersByTime(1001);
    expect(d.isHanging()).toBe(true);
  });

  it('resets on ping', () => {
    const d = new HangDetector({ timeoutMs: 1000 });
    d.start();
    vi.advanceTimersByTime(800);
    d.ping();
    vi.advanceTimersByTime(800);
    expect(d.isHanging()).toBe(false);
  });
});

describe('backoffMs', () => {
  it('doubles each attempt', () => {
    expect(backoffMs(0)).toBe(2000);
    expect(backoffMs(1)).toBe(4000);
    expect(backoffMs(2)).toBe(8000);
  });

  it('caps at 30s', () => {
    expect(backoffMs(10)).toBe(30000);
  });
});

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxRetries: 3, timeoutMs: 1000 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure then succeeds', async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls < 3) throw new Error('fail');
      return 'success';
    });
    const result = await withRetry(fn, { maxRetries: 3, timeoutMs: 1000 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, { maxRetries: 2, timeoutMs: 1000 })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});
