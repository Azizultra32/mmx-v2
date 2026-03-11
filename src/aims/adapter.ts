export class AimsAdapter {
  constructor(private config: { baseUrl: string; apiKey: string }) {}

  private async post(path: string, body: unknown): Promise<void> {
    try {
      await fetch(`${this.config.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      /* silent offline fallback */
    }
  }

  register(p: { runId: string; targetPath: string }) {
    return this.post('/api/v1/mmx/register', p);
  }

  heartbeat(p: { runId: string; status: string; stage?: string }) {
    return this.post('/api/v1/mmx/heartbeat', p);
  }

  taskUpdate(p: { runId: string; stage: string; status: string; costUsd?: number }) {
    return this.post('/api/v1/mmx/task-update', p);
  }

  blocker(p: { runId: string; reason: string }) {
    return this.post('/api/v1/mmx/blocker', p);
  }

  planSignal(p: { runId: string; signal: string }) {
    return this.post('/api/v1/mmx/plan-signal', p);
  }

  spawnRequest(p: { runId: string; role: string; task: string }) {
    return this.post('/api/v1/mmx/spawn-request', p);
  }

  directive(p: { runId: string }) {
    return this.post('/api/v1/mmx/directive', p);
  }
}

export function createAimsAdapter(): AimsAdapter | null {
  const baseUrl = process.env.AIMS_URL;
  const apiKey = process.env.AIMS_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return new AimsAdapter({ baseUrl, apiKey });
}
