import { describe, it, expect } from 'vitest';
import { computeBackoff, detectRateLimit, isHanging, BASE_BACKOFF_MS, RATE_LIMIT_BASE_MS, MAX_BACKOFF_MS } from './daemon.js';

describe('computeBackoff', () => {
  it('returns base backoff on attempt 0', () => {
    expect(computeBackoff(0)).toBe(BASE_BACKOFF_MS);
  });
  it('doubles each attempt', () => {
    expect(computeBackoff(1)).toBe(BASE_BACKOFF_MS * 2);
    expect(computeBackoff(2)).toBe(BASE_BACKOFF_MS * 4);
  });
  it('uses rate limit base when flagged', () => {
    expect(computeBackoff(0, true)).toBe(RATE_LIMIT_BASE_MS);
    expect(computeBackoff(1, true)).toBe(RATE_LIMIT_BASE_MS * 2);
  });
  it('caps at MAX_BACKOFF_MS', () => {
    expect(computeBackoff(10, true)).toBe(MAX_BACKOFF_MS);
    expect(computeBackoff(20)).toBe(MAX_BACKOFF_MS);
  });
});

describe('detectRateLimit', () => {
  it('detects rate_limit', () => { expect(detectRateLimit('rate_limit_error: too many')).toBe(true); });
  it('detects overloaded', () => { expect(detectRateLimit('overloaded_error: capacity')).toBe(true); });
  it('detects too many requests', () => { expect(detectRateLimit('too many requests')).toBe(true); });
  it('ignores unrelated errors', () => { expect(detectRateLimit('connection refused')).toBe(false); });
});

describe('isHanging', () => {
  it('true when no output for longer than timeout', () => {
    expect(isHanging(Date.now() - 130_000, 120_000)).toBe(true);
  });
  it('false when output was recent', () => {
    expect(isHanging(Date.now() - 10_000, 120_000)).toBe(false);
  });
  it('false when exactly at boundary', () => {
    expect(isHanging(Date.now() - 119_000, 120_000)).toBe(false);
  });
});
