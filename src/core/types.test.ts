import { describe, it, expect } from 'vitest';
import type { RunCard, ArtifactIOItem, AcceptanceCheck, ThreadBlock, UnitState } from './types.js';

describe('RunCard type', () => {
  it('accepts a valid RunCard with all 13 fields', () => {
    const card: RunCard = {
      contract_type: 'fresh_agent',
      run_id: 'mmx-abc12345',
      agent_id: 'agent-find-001',
      stage: 'find',
      role: 'find-agent',
      thread_mode: 'fresh',
      model: 'claude-opus-4-6',
      thread: { parent_thread_id: null, fork_root_thread_id: null, fork_path: null, fork_depth: null, fork_reason: null, max_turns: 20 },
      inputs: [],
      outputs: [],
      rules: ['read only declared inputs'],
      acceptance_checks: [],
      next_consumer: { role: 'distill-challenger', stage: 'distill' },
    };
    expect(card.contract_type).toBe('fresh_agent');
    expect(card.thread_mode).toBe('fresh');
    expect(card.model).toBe('claude-opus-4-6');
  });

  it('UnitState covers all 12 states', () => {
    const states: UnitState[] = ['pending','validating_inputs','ready','running','wrote_outputs','validating_outputs','complete','blocked','contract_breach','failed','parked','awaiting_human'];
    expect(states).toHaveLength(12);
  });
});
