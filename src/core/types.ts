export type StageId =
  | 'cathedral' | 'find' | 'distill' | 'predict'
  | 'propose' | 'implement' | 'finalguard' | 'humangate';

export type StateValue =
  | 'INITIALIZED' | 'CATHEDRALED' | 'FOUND' | 'DISTILLED'
  | 'PREDICTED' | 'PROPOSED' | 'IMPLEMENTED' | 'GUARDED'
  | 'COMPLETE' | 'FAILED';

export interface RunCard {
  runId: string;
  targetPath: string;
  workspacePath: string;
  stage: StageId;
  level: number;
  budgetUsd: number;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  createdAt: string;
  timeoutMs: number;
}

export interface StageResult {
  ok: boolean;
  runId: string;
  stage: StageId;
  outputPaths: Record<string, string>;
  costUsd: number;
  error?: string;
}

export interface InvestigationState {
  version: '2.0';
  runId: string;
  targetPath: string;
  level: number;
  state: StateValue;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  totalCostUsd: number;
  findingCount?: number;
  survivingFindingCount?: number;
  error?: string;
}
