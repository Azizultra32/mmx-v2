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

export interface TargetJson {
  target_id: string;
  display_name: string;
  source_type: 'demo' | 'github' | 'local';
  source_path: string;
  created_at: string;
  engine_version: string;
}

export interface CurrentJson {
  latest_run_id: string | null;
  active_run_id: string | null;
  selected_run_id: string | null;
}

export interface HistoryEntry {
  run_id: string;
  created_at: string;
  completed_at: string | null;
  status: string;
  stage_reached: string | null;
  cost_usd: number;
}

export class TargetWorkspace {
  constructor(private targetPath: string) {}

  private get workspaceDir(): string {
    return path.join(this.targetPath, '.mmx');
  }

  async initTarget(opts: {
    targetId: string;
    displayName: string;
    sourceType: 'demo' | 'github' | 'local';
    sourcePath?: string;
    engineVersion: string;
  }): Promise<void> {
    await fs.mkdir(this.workspaceDir, { recursive: true });

    const target: TargetJson = {
      target_id: opts.targetId,
      display_name: opts.displayName,
      source_type: opts.sourceType,
      source_path: opts.sourcePath ?? this.targetPath,
      created_at: new Date().toISOString(),
      engine_version: opts.engineVersion,
    };
    await fs.writeFile(
      path.join(this.workspaceDir, 'target.json'),
      JSON.stringify(target, null, 2),
      'utf8',
    );

    // Only write current.json if it doesn't exist yet
    const currentPath = path.join(this.workspaceDir, 'current.json');
    try {
      await fs.access(currentPath);
    } catch {
      const current: CurrentJson = {
        latest_run_id: null,
        active_run_id: null,
        selected_run_id: null,
      };
      await fs.writeFile(currentPath, JSON.stringify(current, null, 2), 'utf8');
    }

    // Only write history.json if it doesn't exist yet
    const historyPath = path.join(this.workspaceDir, 'history.json');
    try {
      await fs.access(historyPath);
    } catch {
      await fs.writeFile(historyPath, JSON.stringify([], null, 2), 'utf8');
    }
  }

  async readTarget(): Promise<TargetJson | null> {
    try {
      const raw = await fs.readFile(path.join(this.workspaceDir, 'target.json'), 'utf8');
      return JSON.parse(raw) as TargetJson;
    } catch {
      return null;
    }
  }

  async updateCurrent(opts: {
    latestRunId?: string;
    activeRunId?: string | null;
    selectedRunId?: string | null;
  }): Promise<void> {
    const existing = await this.readCurrent() ?? {
      latest_run_id: null,
      active_run_id: null,
      selected_run_id: null,
    };

    const updated: CurrentJson = {
      latest_run_id: opts.latestRunId !== undefined ? opts.latestRunId : existing.latest_run_id,
      active_run_id: opts.activeRunId !== undefined ? opts.activeRunId : existing.active_run_id,
      selected_run_id: opts.selectedRunId !== undefined ? opts.selectedRunId : existing.selected_run_id,
    };

    await fs.mkdir(this.workspaceDir, { recursive: true });
    await fs.writeFile(
      path.join(this.workspaceDir, 'current.json'),
      JSON.stringify(updated, null, 2),
      'utf8',
    );
  }

  async readCurrent(): Promise<CurrentJson | null> {
    try {
      const raw = await fs.readFile(path.join(this.workspaceDir, 'current.json'), 'utf8');
      return JSON.parse(raw) as CurrentJson;
    } catch {
      return null;
    }
  }

  async appendHistory(entry: HistoryEntry): Promise<void> {
    const existing = await this.readHistory();
    existing.push(entry);
    await fs.mkdir(this.workspaceDir, { recursive: true });
    await fs.writeFile(
      path.join(this.workspaceDir, 'history.json'),
      JSON.stringify(existing, null, 2),
      'utf8',
    );
  }

  async readHistory(): Promise<HistoryEntry[]> {
    try {
      const raw = await fs.readFile(path.join(this.workspaceDir, 'history.json'), 'utf8');
      return JSON.parse(raw) as HistoryEntry[];
    } catch {
      return [];
    }
  }
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
      '.mmx',
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
