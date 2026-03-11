import { promises as fs } from 'fs';
import path from 'path';
import type { InvestigationState, StateValue } from '../core/types.js';
import { runDir, runStatePath } from './paths.js';

export async function initRun(
  targetPath: string,
  runId: string,
  level: number,
): Promise<InvestigationState> {
  await fs.mkdir(runDir(targetPath, runId), { recursive: true });
  const state: InvestigationState = {
    version: '2.0',
    runId,
    targetPath,
    level,
    state: 'INITIALIZED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalCostUsd: 0,
  };
  await writeRunState(targetPath, runId, state);
  return state;
}

export async function readRunState(
  targetPath: string,
  runId: string,
): Promise<InvestigationState | null> {
  try {
    const raw = await fs.readFile(runStatePath(targetPath, runId), 'utf-8');
    return JSON.parse(raw) as InvestigationState;
  } catch {
    return null;
  }
}

export async function writeRunState(
  targetPath: string,
  runId: string,
  state: InvestigationState,
): Promise<void> {
  const p = runStatePath(targetPath, runId);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(state, null, 2), 'utf-8');
}

export async function transitionState(
  targetPath: string,
  runId: string,
  newState: StateValue,
  error?: string,
): Promise<InvestigationState> {
  const current = await readRunState(targetPath, runId);
  if (!current) throw new Error(`No state for run ${runId}`);
  const updated: InvestigationState = {
    ...current,
    state: newState,
    updatedAt: new Date().toISOString(),
    completedAt: ['COMPLETE', 'FAILED'].includes(newState) ? new Date().toISOString() : undefined,
    error,
  };
  await writeRunState(targetPath, runId, updated);
  return updated;
}

export async function listRunIds(targetPath: string): Promise<string[]> {
  const { runsDir } = await import('./paths.js');
  try {
    const entries = await fs.readdir(runsDir(targetPath), { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name).reverse();
  } catch {
    return [];
  }
}
