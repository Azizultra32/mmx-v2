export interface DaemonOptions {
  timeoutMs: number;
  maxRetries?: number;
}

/**
 * Tracks last activity time to detect hung SDK calls.
 * Call start() when a stage begins, ping() on each SDK output,
 * and isHanging() to check if it's been silent too long.
 */
export class HangDetector {
  private timeoutMs: number;
  private lastActivity: number = 0;

  constructor(opts: DaemonOptions) {
    this.timeoutMs = opts.timeoutMs;
  }

  /** Resets lastActivity to now */
  start(): void {
    this.lastActivity = Date.now();
  }

  /** Resets lastActivity to now (call on each SDK output) */
  ping(): void {
    this.lastActivity = Date.now();
  }

  /** Returns true if Date.now() - lastActivity > timeoutMs */
  isHanging(): boolean {
    return Date.now() - this.lastActivity > this.timeoutMs;
  }
}

/**
 * Returns exponential backoff delay in ms: min(baseMs * 2^attempt, capMs)
 * Defaults: baseMs=2000, capMs=30000
 */
export function backoffMs(attempt: number, baseMs: number = 2000, capMs: number = 30000): number {
  return Math.min(baseMs * Math.pow(2, attempt), capMs);
}

/**
 * Retries fn up to maxRetries times with exponential backoff.
 * Total attempts = 1 (initial) + maxRetries.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries: number; timeoutMs: number; onRetry?: (attempt: number) => void }
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < opts.maxRetries) {
        if (opts.onRetry) {
          opts.onRetry(attempt);
        }
        const delay = backoffMs(attempt, undefined, opts.timeoutMs);
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
