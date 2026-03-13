import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { runFind } from '../find/index.js';
import { runDistill } from '../distill/index.js';
import { runPredict } from '../predict/index.js';
import { runPropose } from '../propose/index.js';
import { runImplement } from '../implement/index.js';
import { runFinalGuard } from '../finalguard/index.js';
import { runHumanGate } from './index.js';
import { Paths } from '../../core/paths.js';

describe('runHumanGate (dryRun)', () => {
  let tmpDir: string;
  const runId = 'mmx-test08';

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmx-humangate-'));
    // Cathedral must run before find — write cathedral schematics
    const paths = new Paths(tmpDir, runId);
    await fs.mkdir(path.dirname(paths.cathedral.schematics), { recursive: true });
    await fs.writeFile(
      paths.cathedral.schematics,
      JSON.stringify({ run_id: runId, subsystems: [], source_refs: [], generated_at: new Date().toISOString() }, null, 2),
      'utf-8',
    );
    await runFind({ targetPath: tmpDir, runId, level: 1, dryRun: true });
    await runDistill({ targetPath: tmpDir, runId, dryRun: true });
    await runPredict({ targetPath: tmpDir, runId, dryRun: true });
    await runPropose({ targetPath: tmpDir, runId, dryRun: true });
    await runImplement({ targetPath: tmpDir, runId, dryRun: true });
    await runFinalGuard({ targetPath: tmpDir, runId, dryRun: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates human packets and marks them awaiting_human', async () => {
    const result = await runHumanGate({ targetPath: tmpDir, runId, dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.stage).toBe('humangate');

    const paths = new Paths(tmpDir, runId);
    const matrixRaw = await fs.readFile(paths.find.convergenceMatrix, 'utf-8');
    const matrix = JSON.parse(matrixRaw);

    for (const f of matrix.findings) {
      const packetRaw = await fs.readFile(paths.humangate.packet(f.fid8), 'utf-8');
      const packet = JSON.parse(packetRaw);
      expect(packet.status).toBe('awaiting_human');
      expect(packet.human_decision).toBeNull();
    }
  });

  it('does not auto-approve — human_decision remains null', async () => {
    await runHumanGate({ targetPath: tmpDir, runId, dryRun: true });

    const paths = new Paths(tmpDir, runId);
    const matrixRaw = await fs.readFile(paths.find.convergenceMatrix, 'utf-8');
    const matrix = JSON.parse(matrixRaw);

    for (const f of matrix.findings) {
      const packetRaw = await fs.readFile(paths.humangate.packet(f.fid8), 'utf-8');
      const packet = JSON.parse(packetRaw);
      expect(packet.human_decision).toBeNull();
    }
  });
});
