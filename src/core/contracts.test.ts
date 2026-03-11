import { describe, it, expect } from 'vitest';
import {
  ARTIFACT_CONTRACTS,
  STAGE_ROUTES,
  getRouteForRole,
  getContractsForStage,
} from './contracts.js';

describe('ARTIFACT_CONTRACTS', () => {
  const ALL_STAGES = ['cathedral', 'find', 'distill', 'predict', 'propose', 'implement', 'finalguard', 'humangate'];

  it('has entries for all 8 stages', () => {
    for (const stage of ALL_STAGES) {
      const found = ARTIFACT_CONTRACTS.some(c => c.stage === stage);
      expect(found, `Missing contracts for stage: ${stage}`).toBe(true);
    }
  });

  it('every contract has handle, ownerRole, and pathPattern containing {run_id}', () => {
    for (const contract of ARTIFACT_CONTRACTS) {
      expect(contract.handle, `Missing handle`).toBeTruthy();
      expect(contract.ownerRole, `Missing ownerRole in ${contract.handle}`).toBeTruthy();
      expect(
        contract.pathPattern,
        `Missing pathPattern in ${contract.handle}`
      ).toContain('{run_id}');
    }
  });
});

describe('getRouteForRole', () => {
  it('returns stage "find" for find-agent', () => {
    const route = getRouteForRole('find-agent');
    expect(route).toBeDefined();
    expect(route!.stage).toBe('find');
  });

  it('returns threadModeDefault "forked" for cathedral-agent', () => {
    const route = getRouteForRole('cathedral-agent');
    expect(route).toBeDefined();
    expect(route!.threadModeDefault).toBe('forked');
  });

  it('returns undefined for unknown role', () => {
    const route = getRouteForRole('nonexistent-role');
    expect(route).toBeUndefined();
  });
});

describe('getContractsForStage', () => {
  it('returns 3 entries for distill stage', () => {
    const contracts = getContractsForStage('distill');
    expect(contracts).toHaveLength(3);
  });

  it('returns contracts only for the requested stage', () => {
    const contracts = getContractsForStage('find');
    for (const c of contracts) {
      expect(c.stage).toBe('find');
    }
  });
});

describe('STAGE_ROUTES', () => {
  it('has one entry per agent role', () => {
    const roles = STAGE_ROUTES.map(r => r.role);
    const uniqueRoles = new Set(roles);
    expect(roles.length).toBe(uniqueRoles.size);
  });

  it('all routes have required fields', () => {
    for (const route of STAGE_ROUTES) {
      expect(route.role).toBeTruthy();
      expect(route.stage).toBeTruthy();
      expect(Array.isArray(route.requiredInputs)).toBe(true);
      expect(Array.isArray(route.producedOutputs)).toBe(true);
      expect(Array.isArray(route.nextConsumers)).toBe(true);
      expect(route.tokenTarget).toBeGreaterThan(0);
    }
  });
});
