import path from 'node:path';

export class Paths {
  readonly workspace: {
    targetJson: string;
    currentJson: string;
    historyJson: string;
  };

  readonly cathedral: {
    brief: string;
    schematics: string;
    briefing: (batchId: string) => string;
  };

  readonly find: {
    raw: (fid8: string) => string;
    merged: (fid8: string) => string;
    convergence: (fid8: string) => string;
    convergenceMatrix: string;
  };

  readonly distill: {
    verdict: (fid8: string) => string;
    challenge: (fid8: string) => string;
    approved: (fid8: string) => string;
  };

  readonly predict: {
    da: (fid8: string) => string;
    fsm: (fid8: string) => string;
    g5: (fid8: string) => string;
    simverify: (fid8: string) => string;
    stenography: (fid8: string, subrole: string) => string;
    approved: (fid8: string) => string;
  };

  readonly propose: {
    proposal: (fid8: string, branch: string) => string;
    stenography: (fid8: string, branch: string) => string;
    scrutiny: (fid8: string, branch: string, role: string) => string;
    approved: (fid8: string, branch: string) => string;
  };

  readonly implement: {
    patch: (fid8: string, cycle: number) => string;
    tests: (fid8: string, cycle: number) => string;
    facts: (fid8: string, cycle: number) => string;
    ifr: (fid8: string, cycle: number) => string;
    approved: (fid8: string) => string;
  };

  readonly finalguard: {
    verdict: (fid8: string) => string;
    notes: (fid8: string) => string;
    receipt: (fid8: string) => string;
  };

  readonly humangate: {
    packet: (fid8: string) => string;
    decision: (fid8: string) => string;
  };

  readonly events: {
    activity: string;
  };

  readonly registry: {
    run: string;
    unit: (agentId: string) => string;
  };

  readonly manifest: {
    artifacts: string;
  };

  constructor(targetPath: string, runId: string) {
    const base = path.join(targetPath, '.mmx', 'runs', runId);

    this.workspace = {
      targetJson: path.join(targetPath, '.mmx', 'target.json'),
      currentJson: path.join(targetPath, '.mmx', 'current.json'),
      historyJson: path.join(targetPath, '.mmx', 'history.json'),
    };

    this.cathedral = {
      brief: path.join(base, 'cathedral', 'brief.md'),
      schematics: path.join(base, 'cathedral', 'schematics', 'index.json'),
      briefing: (batchId: string) =>
        path.join(base, 'cathedral', 'briefings', `${batchId}.json`),
    };

    this.find = {
      raw: (fid8: string) => path.join(base, 'find', 'raw', `${fid8}.json`),
      merged: (fid8: string) =>
        path.join(base, 'find', 'merged', `${fid8}.json`),
      convergence: (fid8: string) =>
        path.join(base, 'find', 'convergence', `${fid8}.json`),
      convergenceMatrix: path.join(
        base,
        'find',
        'convergence',
        'convergence-matrix.json',
      ),
    };

    this.distill = {
      verdict: (fid8: string) =>
        path.join(base, 'distill', 'verdicts', `${fid8}.json`),
      challenge: (fid8: string) =>
        path.join(base, 'distill', 'challenges', `${fid8}.md`),
      approved: (fid8: string) =>
        path.join(base, 'distill', 'approved', `${fid8}.packet.json`),
    };

    this.predict = {
      da: (fid8: string) => path.join(base, 'predict', 'da', `${fid8}.json`),
      fsm: (fid8: string) =>
        path.join(base, 'predict', 'fsm', `${fid8}.json`),
      g5: (fid8: string) => path.join(base, 'predict', 'g5', `${fid8}.json`),
      simverify: (fid8: string) =>
        path.join(base, 'predict', 'simverify', `${fid8}.json`),
      stenography: (fid8: string, subrole: string) =>
        path.join(base, 'predict', 'stenography', `${fid8}-${subrole}.md`),
      approved: (fid8: string) =>
        path.join(base, 'predict', 'approved', `${fid8}.packet.json`),
    };

    this.propose = {
      proposal: (fid8: string, branch: string) =>
        path.join(base, 'propose', 'proposals', `${fid8}.${branch}.json`),
      stenography: (fid8: string, branch: string) =>
        path.join(base, 'propose', 'stenography', `${fid8}-${branch}.md`),
      scrutiny: (fid8: string, branch: string, role: string) =>
        path.join(
          base,
          'propose',
          'scrutiny',
          `${fid8}.${branch}.${role}.json`,
        ),
      approved: (fid8: string, branch: string) =>
        path.join(
          base,
          'propose',
          'approved',
          `${fid8}.${branch}.packet.json`,
        ),
    };

    this.implement = {
      patch: (fid8: string, cycle: number) =>
        path.join(base, 'implement', 'patches', `${fid8}.${cycle}.diff`),
      tests: (fid8: string, cycle: number) =>
        path.join(base, 'implement', 'tests', `${fid8}.${cycle}.json`),
      facts: (fid8: string, cycle: number) =>
        path.join(base, 'implement', 'facts', `${fid8}.${cycle}.json`),
      ifr: (fid8: string, cycle: number) =>
        path.join(base, 'implement', 'ifr', `${fid8}.${cycle}.json`),
      approved: (fid8: string) =>
        path.join(base, 'implement', 'approved', `${fid8}.packet.json`),
    };

    this.finalguard = {
      verdict: (fid8: string) =>
        path.join(base, 'finalguard', 'verdicts', `${fid8}.json`),
      notes: (fid8: string) =>
        path.join(base, 'finalguard', 'notes', `${fid8}.md`),
      receipt: (fid8: string) =>
        path.join(base, 'finalguard', 'receipt', `${fid8}.html`),
    };

    this.humangate = {
      packet: (fid8: string) =>
        path.join(base, 'human', 'packets', `${fid8}.packet.json`),
      decision: (fid8: string) =>
        path.join(base, 'human', 'decisions', `${fid8}.json`),
    };

    this.events = {
      activity: path.join(base, 'events', 'activity.jsonl'),
    };

    this.registry = {
      run: path.join(base, 'registry', 'run.json'),
      unit: (agentId: string) =>
        path.join(base, 'registry', 'units', `${agentId}.json`),
    };

    this.manifest = {
      artifacts: path.join(base, 'manifest', 'artifacts.json'),
    };
  }
}
