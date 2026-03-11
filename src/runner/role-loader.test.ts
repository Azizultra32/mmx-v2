import { describe, it, expect } from 'vitest';
import { loadRoleSkill } from './role-loader.js';

const ROLES = [
  'cathedral',
  'find',
  'distill-challenger',
  'predict-da',
  'predict-fsm',
  'predict-g5',
  'predict-simverify',
  'propose-architect',
  'implement-holistic',
  'finalguard',
];

describe('role-loader', () => {
  for (const role of ROLES) {
    it(`loads ${role} role skill and is >50 chars`, async () => {
      const skill = await loadRoleSkill(role);
      expect(typeof skill).toBe('string');
      expect(skill.length).toBeGreaterThan(50);
    });
  }

  it('throws when role not found', async () => {
    await expect(loadRoleSkill('nonexistent-role')).rejects.toThrow();
  });
});
