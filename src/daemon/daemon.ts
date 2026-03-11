export const BASE_BACKOFF_MS = 5_000;
export const RATE_LIMIT_BASE_MS = 15_000;
export const MAX_BACKOFF_MS = 300_000;
export const HANG_TIMEOUT_MS = 120_000;

export function computeBackoff(attempt: number, isRateLimit = false): number {
  const base = isRateLimit ? RATE_LIMIT_BASE_MS : BASE_BACKOFF_MS;
  return Math.min(base * Math.pow(2, attempt), MAX_BACKOFF_MS);
}

export function detectRateLimit(msg: string): boolean {
  return (
    msg.includes('rate_limit') ||
    msg.includes('overloaded') ||
    msg.includes('too many requests') ||
    msg.includes('capacity exceeded')
  );
}

export function isHanging(lastOutputAt: number, timeoutMs = HANG_TIMEOUT_MS): boolean {
  return Date.now() - lastOutputAt > timeoutMs;
}

export interface DaemonState {
  runId: string;
  targetPath: string;
  stage: string;
  lastOutputAt: number;
  attempt: number;
  status: 'running' | 'hanging' | 'failed' | 'complete';
}
