import fs from 'fs/promises';
import path from 'path';
import { UnitState } from '../core/types.js';

export interface RunState {
  run_id: string;
  target_path: string;
  level: number;
  state: UnitState;
  active_stage: string | null;
  total_cost_usd: number;
  created_at: string;   // ISO-8601
  updated_at: string;   // ISO-8601
  completed_at: string | null;
  error: string | null;
}

export class RunRegistry {
  private readonly registryPath: string;
  private readonly targetPath: string;
  private readonly runId: string;

  constructor(targetPath: string, runId: string) {
    this.targetPath = targetPath;
    this.runId = runId;
    this.registryPath = path.join(
      targetPath,
      '.metamatrix',
      'runs',
      runId,
      'registry',
      'run.json',
    );
  }

  async init(opts: { level: number; targetPath?: string }): Promise<void> {
    await fs.mkdir(path.dirname(this.registryPath), { recursive: true });

    const now = new Date().toISOString();
    const state: RunState = {
      run_id: this.runId,
      target_path: opts.targetPath ?? this.targetPath,
      level: opts.level,
      state: 'pending',
      active_stage: null,
      total_cost_usd: 0,
      created_at: now,
      updated_at: now,
      completed_at: null,
      error: null,
    };

    await fs.writeFile(this.registryPath, JSON.stringify(state, null, 2), 'utf8');
  }

  async read(): Promise<RunState> {
    const raw = await fs.readFile(this.registryPath, 'utf8');
    return JSON.parse(raw) as RunState;
  }

  async transition(
    newState: UnitState,
    opts?: { stage?: string; costUsd?: number; error?: string },
  ): Promise<void> {
    const current = await this.read();
    const now = new Date().toISOString();

    const isTerminal = newState === 'complete' || newState === 'failed';

    const updated: RunState = {
      ...current,
      state: newState,
      active_stage: opts?.stage !== undefined ? opts.stage : current.active_stage,
      total_cost_usd: current.total_cost_usd + (opts?.costUsd ?? 0),
      updated_at: now,
      completed_at: isTerminal ? now : current.completed_at,
      error: opts?.error !== undefined ? opts.error : current.error,
    };

    await fs.writeFile(this.registryPath, JSON.stringify(updated, null, 2), 'utf8');
  }
}
