export interface AimsConfig {
  baseUrl: string;
  apiKey: string;
}

export interface AimsResult {
  ok: boolean;
  offline: boolean;
  error?: string;
}

export class AimsAdapter {
  constructor(private config: AimsConfig) {}

  private async post(path: string, body: unknown): Promise<AimsResult> {
    try {
      const res = await fetch(`${this.config.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      return { ok: res.ok, offline: false };
    } catch {
      return { ok: false, offline: true };
    }
  }

  register(p: { runId: string; targetPath: string }): Promise<AimsResult> {
    return this.post('/api/v1/mmx/register', p);
  }

  heartbeat(p: { runId: string; status: string; stage?: string }): Promise<AimsResult> {
    return this.post('/api/v1/mmx/heartbeat', p);
  }

  taskUpdate(p: { runId: string; stage: string; status: string; costUsd?: number }): Promise<AimsResult> {
    return this.post('/api/v1/mmx/task-update', p);
  }

  blocker(p: { runId: string; reason: string }): Promise<AimsResult> {
    return this.post('/api/v1/mmx/blocker', p);
  }

  planSignal(p: { runId: string; signal: string }): Promise<AimsResult> {
    return this.post('/api/v1/mmx/plan-signal', p);
  }

  spawnRequest(p: { runId: string; role: string; task: string }): Promise<AimsResult> {
    return this.post('/api/v1/mmx/spawn-request', p);
  }

  directive(p: { runId: string }): Promise<AimsResult & { directive?: unknown }> {
    return this.post('/api/v1/mmx/directive', p) as Promise<AimsResult & { directive?: unknown }>;
  }
}

export function createAimsAdapter(): AimsAdapter | null {
  const baseUrl = process.env.AIMS_URL;
  const apiKey = process.env.AIMS_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return new AimsAdapter({ baseUrl, apiKey });
}
