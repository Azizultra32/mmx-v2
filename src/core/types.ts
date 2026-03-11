// StageId — 8 stages
export type StageId = 'cathedral' | 'find' | 'distill' | 'predict' | 'propose' | 'implement' | 'finalguard' | 'humangate';

// ContractType
export type ContractType = 'fresh_agent' | 'forked_agent';

// ThreadMode
export type ThreadMode = 'fresh' | 'forked';

// UnitState — exactly 12 states
export type UnitState = 'pending' | 'validating_inputs' | 'ready' | 'running' | 'wrote_outputs' | 'validating_outputs' | 'complete' | 'blocked' | 'contract_breach' | 'failed' | 'parked' | 'awaiting_human';

// ArtifactIOItem
export interface ArtifactIOItem {
  handle: string;
  path: string;
  required: boolean;
  format: 'json' | 'markdown' | 'diff' | 'text' | 'html' | 'jsonl';
  schema_ref: string | null;
  owner_role: string | null;
}

// AcceptanceCheck
export interface AcceptanceCheck {
  description: string;
  required: boolean;
}

// ThreadBlock
export interface ThreadBlock {
  parent_thread_id: string | null;
  fork_root_thread_id: string | null;
  fork_path: string | null;
  fork_depth: number | null;
  fork_reason: string | null;
  max_turns: number | null;
}

// NextConsumer
export interface NextConsumer {
  role: string | null;
  stage: string | null;
}

// RunCard — all 13 required fields
export interface RunCard {
  contract_type: ContractType;
  run_id: string;
  agent_id: string;
  stage: StageId;
  role: string;
  thread_mode: ThreadMode;
  model: string;
  thread: ThreadBlock;
  inputs: ArtifactIOItem[];
  outputs: ArtifactIOItem[];
  rules: string[];
  acceptance_checks: AcceptanceCheck[];
  next_consumer: NextConsumer;
}

// RunnerResult
export interface RunnerResult {
  ok: boolean;
  output: string;
  completed: boolean;
  costUsd: number;
  error?: string;
}

// StageResult
export interface StageResult {
  ok: boolean;
  runId: string;
  stage: StageId;
  outputPaths: Record<string, string>;
  costUsd: number;
  error?: string;
}

// DistillVerdict
export type DistillVerdict = 'approve' | 'reject' | 'needs_revision';

// HumanDecision
export type HumanDecision = 'APPROVE' | 'REJECT' | 'SEND_BACK' | 'PARK';
