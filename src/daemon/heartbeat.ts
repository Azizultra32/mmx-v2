export interface HeartbeatPayload {
  runId: string;
  targetPath: string;
  stage: string;
  status: string;
  timestamp: string;
}

export class HeartbeatEmitter {
  private timer: ReturnType<typeof setInterval> | null = null;

  start(
    payload: Omit<HeartbeatPayload, 'timestamp'>,
    onBeat: (p: HeartbeatPayload) => void,
    intervalMs = 30_000,
  ): void {
    this.stop();
    this.timer = setInterval(
      () => onBeat({ ...payload, timestamp: new Date().toISOString() }),
      intervalMs,
    );
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
