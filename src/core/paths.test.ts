import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { Paths } from './paths.js';

const TARGET = '/project/root';
const RUN_ID = 'run-001';
const BASE = path.join(TARGET, '.mmx', 'runs', RUN_ID);
const FID8 = 'ab12cd34';

const p = new Paths(TARGET, RUN_ID);

describe('Paths', () => {
  describe('workspace', () => {
    it('targetJson', () => {
      expect(p.workspace.targetJson).toBe(path.join(TARGET, '.mmx', 'target.json'));
    });
    it('currentJson', () => {
      expect(p.workspace.currentJson).toBe(path.join(TARGET, '.mmx', 'current.json'));
    });
    it('historyJson', () => {
      expect(p.workspace.historyJson).toBe(path.join(TARGET, '.mmx', 'history.json'));
    });
  });

  describe('cathedral', () => {
    it('brief', () => {
      expect(p.cathedral.brief).toBe(path.join(BASE, 'cathedral', 'brief.md'));
    });
    it('schematics', () => {
      expect(p.cathedral.schematics).toBe(
        path.join(BASE, 'cathedral', 'schematics', 'index.json'),
      );
    });
    it('briefing(batchId)', () => {
      expect(p.cathedral.briefing('b01')).toBe(
        path.join(BASE, 'cathedral', 'briefings', 'b01.json'),
      );
    });
  });

  describe('find', () => {
    it('raw(fid8)', () => {
      expect(p.find.raw(FID8)).toBe(
        path.join(BASE, 'find', 'raw', `${FID8}.json`),
      );
    });
    it('merged(fid8)', () => {
      expect(p.find.merged(FID8)).toBe(
        path.join(BASE, 'find', 'merged', `${FID8}.json`),
      );
    });
    it('convergence(fid8)', () => {
      expect(p.find.convergence(FID8)).toBe(
        path.join(BASE, 'find', 'convergence', `${FID8}.json`),
      );
    });
    it('convergenceMatrix', () => {
      expect(p.find.convergenceMatrix).toBe(
        path.join(BASE, 'find', 'convergence', 'convergence-matrix.json'),
      );
    });
  });

  describe('distill', () => {
    it('verdict(fid8)', () => {
      expect(p.distill.verdict(FID8)).toBe(
        path.join(BASE, 'distill', 'verdicts', `${FID8}.json`),
      );
    });
    it('challenge(fid8)', () => {
      expect(p.distill.challenge(FID8)).toBe(
        path.join(BASE, 'distill', 'challenges', `${FID8}.md`),
      );
    });
    it('approved(fid8)', () => {
      expect(p.distill.approved(FID8)).toBe(
        path.join(BASE, 'distill', 'approved', `${FID8}.packet.json`),
      );
    });
  });

  describe('predict', () => {
    it('da(fid8)', () => {
      expect(p.predict.da(FID8)).toBe(
        path.join(BASE, 'predict', 'da', `${FID8}.json`),
      );
    });
    it('fsm(fid8)', () => {
      expect(p.predict.fsm(FID8)).toBe(
        path.join(BASE, 'predict', 'fsm', `${FID8}.json`),
      );
    });
    it('g5(fid8)', () => {
      expect(p.predict.g5(FID8)).toBe(
        path.join(BASE, 'predict', 'g5', `${FID8}.json`),
      );
    });
    it('simverify(fid8)', () => {
      expect(p.predict.simverify(FID8)).toBe(
        path.join(BASE, 'predict', 'simverify', `${FID8}.json`),
      );
    });
    it('stenography(fid8, subrole)', () => {
      expect(p.predict.stenography(FID8, 'da')).toBe(
        path.join(BASE, 'predict', 'stenography', `${FID8}-da.md`),
      );
    });
    it('approved(fid8)', () => {
      expect(p.predict.approved(FID8)).toBe(
        path.join(BASE, 'predict', 'approved', `${FID8}.packet.json`),
      );
    });
  });

  describe('propose', () => {
    it('proposal(fid8, branch)', () => {
      expect(p.propose.proposal(FID8, 'a')).toBe(
        path.join(BASE, 'propose', 'proposals', `${FID8}.a.json`),
      );
    });
    it('stenography(fid8, branch)', () => {
      expect(p.propose.stenography(FID8, 'a')).toBe(
        path.join(BASE, 'propose', 'stenography', `${FID8}-a.md`),
      );
    });
    it('scrutiny(fid8, branch, role)', () => {
      expect(p.propose.scrutiny(FID8, 'a', 'scrutiny-role')).toBe(
        path.join(
          BASE,
          'propose',
          'scrutiny',
          `${FID8}.a.scrutiny-role.json`,
        ),
      );
    });
    it('approved(fid8, branch)', () => {
      expect(p.propose.approved(FID8, 'a')).toBe(
        path.join(BASE, 'propose', 'approved', `${FID8}.a.packet.json`),
      );
    });
  });

  describe('implement', () => {
    it('patch(fid8, cycle)', () => {
      expect(p.implement.patch(FID8, 1)).toBe(
        path.join(BASE, 'implement', 'patches', `${FID8}.1.diff`),
      );
    });
    it('tests(fid8, cycle)', () => {
      expect(p.implement.tests(FID8, 1)).toBe(
        path.join(BASE, 'implement', 'tests', `${FID8}.1.json`),
      );
    });
    it('facts(fid8, cycle)', () => {
      expect(p.implement.facts(FID8, 1)).toBe(
        path.join(BASE, 'implement', 'facts', `${FID8}.1.json`),
      );
    });
    it('ifr(fid8, cycle)', () => {
      expect(p.implement.ifr(FID8, 1)).toBe(
        path.join(BASE, 'implement', 'ifr', `${FID8}.1.json`),
      );
    });
    it('approved(fid8)', () => {
      expect(p.implement.approved(FID8)).toBe(
        path.join(BASE, 'implement', 'approved', `${FID8}.packet.json`),
      );
    });
  });

  describe('finalguard', () => {
    it('verdict(fid8)', () => {
      expect(p.finalguard.verdict(FID8)).toBe(
        path.join(BASE, 'finalguard', 'verdicts', `${FID8}.json`),
      );
    });
    it('notes(fid8)', () => {
      expect(p.finalguard.notes(FID8)).toBe(
        path.join(BASE, 'finalguard', 'notes', `${FID8}.md`),
      );
    });
    it('receipt(fid8)', () => {
      expect(p.finalguard.receipt(FID8)).toBe(
        path.join(BASE, 'finalguard', 'receipt', `${FID8}.html`),
      );
    });
  });

  describe('humangate', () => {
    it('packet(fid8)', () => {
      expect(p.humangate.packet(FID8)).toBe(
        path.join(BASE, 'human', 'packets', `${FID8}.packet.json`),
      );
    });
    it('decision(fid8)', () => {
      expect(p.humangate.decision(FID8)).toBe(
        path.join(BASE, 'human', 'decisions', `${FID8}.json`),
      );
    });
  });

  describe('events', () => {
    it('activity', () => {
      expect(p.events.activity).toBe(
        path.join(BASE, 'events', 'activity.jsonl'),
      );
    });
  });

  describe('registry', () => {
    it('run', () => {
      expect(p.registry.run).toBe(path.join(BASE, 'registry', 'run.json'));
    });
    it('unit(agentId)', () => {
      expect(p.registry.unit('agent-1')).toBe(
        path.join(BASE, 'registry', 'units', 'agent-1.json'),
      );
    });
  });

  describe('manifest', () => {
    it('artifacts', () => {
      expect(p.manifest.artifacts).toBe(
        path.join(BASE, 'manifest', 'artifacts.json'),
      );
    });
  });
});
