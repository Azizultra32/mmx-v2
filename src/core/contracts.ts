import type { StageId, ThreadMode } from './types.js';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface ArtifactContract {
  handle: string;
  stage: StageId;
  ownerRole: string;
  pathPattern: string;
  format: 'json' | 'markdown' | 'diff' | 'text' | 'html' | 'jsonl';
  cardinality: 'one' | 'many';
  branchScoped: boolean;
  canonical: boolean;
  consumers: string[];
}

export interface RoleRoute {
  role: string;
  stage: StageId;
  requiredInputs: string[];
  producedOutputs: string[];
  nextConsumers: string[];
  threadModeDefault: ThreadMode;
  tokenTarget: number;
}

// ─── Artifact Contracts ──────────────────────────────────────────────────────

export const ARTIFACT_CONTRACTS: ArtifactContract[] = [
  // ── Cathedral ──────────────────────────────────────────────────────────────
  {
    handle: 'cathedral.brief',
    stage: 'cathedral',
    ownerRole: 'cathedral-agent',
    pathPattern: '.metamatrix/runs/{run_id}/cathedral/brief.md',
    format: 'markdown',
    cardinality: 'one',
    branchScoped: false,
    canonical: true,
    consumers: ['find-agent'],
  },
  {
    handle: 'cathedral.schematics',
    stage: 'cathedral',
    ownerRole: 'cathedral-agent',
    pathPattern: '.metamatrix/runs/{run_id}/cathedral/schematics/index.json',
    format: 'json',
    cardinality: 'one',
    branchScoped: false,
    canonical: true,
    consumers: ['find-agent', 'distill-challenger'],
  },
  {
    handle: 'cathedral.briefing',
    stage: 'cathedral',
    ownerRole: 'cathedral-agent',
    pathPattern: '.metamatrix/runs/{run_id}/cathedral/briefings/{batch_id}.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: false,
    consumers: ['find-agent'],
  },

  // ── Find ───────────────────────────────────────────────────────────────────
  {
    handle: 'find.raw',
    stage: 'find',
    ownerRole: 'find-agent',
    pathPattern: '.metamatrix/runs/{run_id}/find/raw/{fid8}.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: false,
    consumers: ['find-agent'],
  },
  {
    handle: 'find.merged',
    stage: 'find',
    ownerRole: 'find-agent',
    pathPattern: '.metamatrix/runs/{run_id}/find/merged/{fid8}.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: true,
    consumers: ['distill-challenger'],
  },
  {
    handle: 'find.convergence',
    stage: 'find',
    ownerRole: 'find-agent',
    pathPattern: '.metamatrix/runs/{run_id}/find/convergence/{fid8}.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: true,
    consumers: ['distill-challenger'],
  },
  {
    handle: 'find.convergence-matrix',
    stage: 'find',
    ownerRole: 'find-agent',
    pathPattern: '.metamatrix/runs/{run_id}/find/convergence/convergence-matrix.json',
    format: 'json',
    cardinality: 'one',
    branchScoped: false,
    canonical: true,
    consumers: ['distill-challenger', 'predict-da'],
  },

  // ── Distill ────────────────────────────────────────────────────────────────
  {
    handle: 'distill.verdict',
    stage: 'distill',
    ownerRole: 'distill-challenger',
    pathPattern: '.metamatrix/runs/{run_id}/distill/verdicts/{fid8}.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: true,
    consumers: ['predict-da', 'predict-fsm', 'predict-g5', 'predict-simverify'],
  },
  {
    handle: 'distill.challenge',
    stage: 'distill',
    ownerRole: 'distill-challenger',
    pathPattern: '.metamatrix/runs/{run_id}/distill/challenges/{fid8}.md',
    format: 'markdown',
    cardinality: 'many',
    branchScoped: false,
    canonical: false,
    consumers: [],
  },
  {
    handle: 'distill.approved',
    stage: 'distill',
    ownerRole: 'distill-challenger',
    pathPattern: '.metamatrix/runs/{run_id}/distill/approved/{fid8}.packet.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: true,
    consumers: ['predict-da', 'predict-fsm', 'predict-g5', 'predict-simverify'],
  },

  // ── Predict ────────────────────────────────────────────────────────────────
  {
    handle: 'predict.da',
    stage: 'predict',
    ownerRole: 'predict-da',
    pathPattern: '.metamatrix/runs/{run_id}/predict/{subrole}/{fid8}.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: false,
    consumers: ['propose-architect'],
  },
  {
    handle: 'predict.fsm',
    stage: 'predict',
    ownerRole: 'predict-fsm',
    pathPattern: '.metamatrix/runs/{run_id}/predict/{subrole}/{fid8}.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: false,
    consumers: ['propose-architect'],
  },
  {
    handle: 'predict.g5',
    stage: 'predict',
    ownerRole: 'predict-g5',
    pathPattern: '.metamatrix/runs/{run_id}/predict/{subrole}/{fid8}.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: false,
    consumers: ['propose-architect'],
  },
  {
    handle: 'predict.simverify',
    stage: 'predict',
    ownerRole: 'predict-simverify',
    pathPattern: '.metamatrix/runs/{run_id}/predict/{subrole}/{fid8}.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: false,
    consumers: ['propose-architect'],
  },
  {
    handle: 'predict.approved',
    stage: 'predict',
    ownerRole: 'predict-da',
    pathPattern: '.metamatrix/runs/{run_id}/predict/approved/{fid8}.packet.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: true,
    consumers: ['propose-architect'],
  },

  // ── Propose ────────────────────────────────────────────────────────────────
  {
    handle: 'propose.proposal',
    stage: 'propose',
    ownerRole: 'propose-architect',
    pathPattern: '.metamatrix/runs/{run_id}/propose/proposals/{fid8}.{branch}.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: true,
    canonical: false,
    consumers: ['implement-holistic'],
  },
  {
    handle: 'propose.approved',
    stage: 'propose',
    ownerRole: 'propose-architect',
    pathPattern: '.metamatrix/runs/{run_id}/propose/approved/{fid8}.{branch}.packet.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: true,
    canonical: true,
    consumers: ['implement-holistic'],
  },

  // ── Implement ──────────────────────────────────────────────────────────────
  {
    handle: 'implement.patch',
    stage: 'implement',
    ownerRole: 'implement-holistic',
    pathPattern: '.metamatrix/runs/{run_id}/implement/patches/{fid8}.{cycle}.diff',
    format: 'diff',
    cardinality: 'many',
    branchScoped: false,
    canonical: false,
    consumers: ['finalguard-agent'],
  },
  {
    handle: 'implement.approved',
    stage: 'implement',
    ownerRole: 'implement-holistic',
    pathPattern: '.metamatrix/runs/{run_id}/implement/approved/{fid8}.packet.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: true,
    consumers: ['finalguard-agent'],
  },
  {
    handle: 'implement.ifr',
    stage: 'implement',
    ownerRole: 'implement-holistic',
    pathPattern: '.metamatrix/runs/{run_id}/implement/ifr/{fid8}.{cycle}.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: false,
    consumers: ['finalguard-agent'],
  },

  // ── FinalGuard ─────────────────────────────────────────────────────────────
  {
    handle: 'finalguard.verdict',
    stage: 'finalguard',
    ownerRole: 'finalguard-agent',
    pathPattern: '.metamatrix/runs/{run_id}/finalguard/verdicts/{fid8}.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: true,
    consumers: ['humangate-agent'],
  },
  {
    handle: 'finalguard.receipt',
    stage: 'finalguard',
    ownerRole: 'finalguard-agent',
    pathPattern: '.metamatrix/runs/{run_id}/finalguard/receipt/{fid8}.html',
    format: 'html',
    cardinality: 'many',
    branchScoped: false,
    canonical: false,
    consumers: ['humangate-agent'],
  },

  // ── HumanGate ──────────────────────────────────────────────────────────────
  {
    handle: 'humangate.packet',
    stage: 'humangate',
    ownerRole: 'humangate-agent',
    pathPattern: '.metamatrix/runs/{run_id}/human/packets/{fid8}.packet.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: true,
    consumers: [],
  },
  {
    handle: 'humangate.decision',
    stage: 'humangate',
    ownerRole: 'humangate-agent',
    pathPattern: '.metamatrix/runs/{run_id}/human/decisions/{fid8}.json',
    format: 'json',
    cardinality: 'many',
    branchScoped: false,
    canonical: true,
    consumers: [],
  },
];

// ─── Stage Routes ────────────────────────────────────────────────────────────

export const STAGE_ROUTES: RoleRoute[] = [
  {
    role: 'cathedral-agent',
    stage: 'cathedral',
    requiredInputs: [],
    producedOutputs: ['cathedral.brief', 'cathedral.schematics', 'cathedral.briefing'],
    nextConsumers: ['find-agent'],
    threadModeDefault: 'forked',
    tokenTarget: 700,
  },
  {
    role: 'find-agent',
    stage: 'find',
    requiredInputs: ['cathedral.brief', 'cathedral.schematics'],
    producedOutputs: ['find.raw', 'find.merged', 'find.convergence', 'find.convergence-matrix'],
    nextConsumers: ['distill-challenger'],
    threadModeDefault: 'fresh',
    tokenTarget: 500,
  },
  {
    role: 'distill-challenger',
    stage: 'distill',
    requiredInputs: ['find.merged', 'find.convergence', 'find.convergence-matrix'],
    producedOutputs: ['distill.verdict', 'distill.challenge', 'distill.approved'],
    nextConsumers: ['predict-da', 'predict-fsm', 'predict-g5', 'predict-simverify'],
    threadModeDefault: 'fresh',
    tokenTarget: 450,
  },
  {
    role: 'predict-da',
    stage: 'predict',
    requiredInputs: ['distill.approved', 'distill.verdict'],
    producedOutputs: ['predict.da'],
    nextConsumers: ['propose-architect'],
    threadModeDefault: 'fresh',
    tokenTarget: 600,
  },
  {
    role: 'predict-fsm',
    stage: 'predict',
    requiredInputs: ['distill.approved', 'distill.verdict'],
    producedOutputs: ['predict.fsm'],
    nextConsumers: ['propose-architect'],
    threadModeDefault: 'fresh',
    tokenTarget: 600,
  },
  {
    role: 'predict-g5',
    stage: 'predict',
    requiredInputs: ['distill.approved', 'distill.verdict'],
    producedOutputs: ['predict.g5'],
    nextConsumers: ['propose-architect'],
    threadModeDefault: 'fresh',
    tokenTarget: 600,
  },
  {
    role: 'predict-simverify',
    stage: 'predict',
    requiredInputs: ['distill.approved', 'distill.verdict'],
    producedOutputs: ['predict.simverify'],
    nextConsumers: ['propose-architect'],
    threadModeDefault: 'fresh',
    tokenTarget: 600,
  },
  {
    role: 'propose-architect',
    stage: 'propose',
    requiredInputs: ['predict.approved', 'predict.da', 'predict.fsm', 'predict.g5', 'predict.simverify'],
    producedOutputs: ['propose.proposal', 'propose.approved'],
    nextConsumers: ['implement-holistic'],
    threadModeDefault: 'forked',
    tokenTarget: 900,
  },
  {
    role: 'implement-holistic',
    stage: 'implement',
    requiredInputs: ['propose.approved'],
    producedOutputs: ['implement.patch', 'implement.approved', 'implement.ifr'],
    nextConsumers: ['finalguard-agent'],
    threadModeDefault: 'fresh',
    tokenTarget: 850,
  },
  {
    role: 'finalguard-agent',
    stage: 'finalguard',
    requiredInputs: ['implement.approved', 'implement.patch'],
    producedOutputs: ['finalguard.verdict', 'finalguard.receipt'],
    nextConsumers: ['humangate-agent'],
    threadModeDefault: 'fresh',
    tokenTarget: 600,
  },
  {
    role: 'humangate-agent',
    stage: 'humangate',
    requiredInputs: ['finalguard.verdict'],
    producedOutputs: ['humangate.packet', 'humangate.decision'],
    nextConsumers: [],
    threadModeDefault: 'fresh',
    tokenTarget: 300,
  },
];

// ─── Query Helpers ───────────────────────────────────────────────────────────

export function getRouteForRole(role: string): RoleRoute | undefined {
  return STAGE_ROUTES.find(r => r.role === role);
}

export function getContractsForStage(stage: StageId): ArtifactContract[] {
  return ARTIFACT_CONTRACTS.filter(c => c.stage === stage);
}
