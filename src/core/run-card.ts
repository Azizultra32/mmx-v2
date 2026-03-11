import { randomBytes } from 'crypto';
import type { RunCard, StageId } from './types.js';

export function createRunCard(opts: {
  targetPath: string;
  workspacePath: string;
  stage: StageId;
  level: number;
  budgetUsd: number;
  inputs?: Record<string, string>;
  outputs?: Record<string, string>;
  timeoutMs?: number;
}): RunCard {
  return {
    runId: `mmx-${randomBytes(4).toString('hex')}`,
    targetPath: opts.targetPath,
    workspacePath: opts.workspacePath,
    stage: opts.stage,
    level: opts.level,
    budgetUsd: opts.budgetUsd,
    inputs: opts.inputs ?? {},
    outputs: opts.outputs ?? {},
    createdAt: new Date().toISOString(),
    timeoutMs: opts.timeoutMs ?? 300_000,
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRunCard(card: RunCard): ValidationResult {
  const errors: string[] = [];
  if (card.budgetUsd <= 0) errors.push('budget must be positive');
  if (!card.targetPath) errors.push('targetPath is required');
  if (!card.workspacePath) errors.push('workspacePath is required');
  if (!card.stage) errors.push('stage is required');
  if (card.level < 1) errors.push('level must be >= 1');
  return { valid: errors.length === 0, errors };
}
