import fs from 'fs/promises';
import path from 'path';
import { Paths } from '../../core/paths.js';
import { StageResult } from '../../core/types.js';
import { EventSpine } from '../../enforcement/events.js';
import { loadRoleSkill } from '../../runner/role-loader.js';
import { assemblePrompt } from '../../enforcement/prompt-assembler.js';
import { runWithSDK } from '../../runner/sdk-runner.js';

export async function runFind(opts: {
  targetPath: string;
  runId: string;
  level: number;
  dryRun?: boolean;
}): Promise<StageResult> {
  const { targetPath, runId, level, dryRun } = opts;
  const paths = new Paths(targetPath, runId);
  const spine = new EventSpine(paths.events.activity);

  await spine.emit({
    event_type: 'DISPATCH_STARTED',
    run_id: runId,
    agent_id: `find-${runId}`,
    stage: 'find',
    role: 'find',
  });

  // Read cathedral schematics FIRST (before dryRun branch) — hard fail if missing
  let schematics: { run_id: string; subsystems: unknown[]; source_refs: unknown[]; generated_at: string };
  try {
    const raw = await fs.readFile(paths.cathedral.schematics, 'utf-8');
    schematics = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      runId,
      stage: 'find',
      outputPaths: {},
      costUsd: 0,
      error: 'INPUT_VALIDATION_FAILED: cathedral schematics not found — cathedral must run before find',
    };
  }

  if (dryRun) {
    // Derive deterministic stub fid8s from runId (not random)
    // Use first 8 chars of sha256(runId + index)
    const { createHash } = await import('node:crypto');
    const stubFid8s = [0, 1].map(i =>
      createHash('sha256').update(`${runId}-stub-${i}`).digest('hex').slice(0, 8)
    );

    // Write stubs with cathedral provenance
    const outputPaths: Record<string, string> = {};
    for (const fid8 of stubFid8s) {
      const rawPath = paths.find.raw(fid8);
      const mergedPath = paths.find.merged(fid8);
      const convergencePath = paths.find.convergence(fid8);

      await fs.mkdir(path.dirname(rawPath), { recursive: true });
      await fs.mkdir(path.dirname(mergedPath), { recursive: true });
      await fs.mkdir(path.dirname(convergencePath), { recursive: true });

      const finding = {
        fid8,
        run_id: runId,
        stage: 'find',
        cathedral_run_id: schematics.run_id,
        severity: 'medium' as const,
        category: 'quality',
        title: `Stub finding ${fid8}`,
        description: 'Dry-run stub finding for testing.',
        location: { file: 'stub.ts', line: 1 },
        evidence: '// stub',
        impact: 'None in dry-run mode.',
        generated_at: new Date().toISOString(),
      };

      await fs.writeFile(rawPath, JSON.stringify(finding, null, 2), 'utf-8');
      await fs.writeFile(mergedPath, JSON.stringify({ ...finding, merged: true }, null, 2), 'utf-8');
      await fs.writeFile(
        convergencePath,
        JSON.stringify({ ...finding, convergence_status: 'converged', vote_count: 3 }, null, 2),
        'utf-8',
      );

      outputPaths[`raw_${fid8}`] = rawPath;
      outputPaths[`merged_${fid8}`] = mergedPath;
      outputPaths[`convergence_${fid8}`] = convergencePath;
    }

    // convergence matrix
    const matrixPath = paths.find.convergenceMatrix;
    await fs.mkdir(path.dirname(matrixPath), { recursive: true });
    await fs.writeFile(matrixPath, JSON.stringify({
      run_id: runId,
      cathedral_run_id: schematics.run_id,
      findings: stubFid8s.map(fid8 => ({ fid8, status: 'converged' })),
      generated_at: new Date().toISOString(),
    }, null, 2), 'utf-8');
    outputPaths['convergence_matrix'] = matrixPath;

    await spine.emit({
      event_type: 'UNIT_COMPLETE',
      run_id: runId,
      agent_id: `find-${runId}`,
      stage: 'find',
      role: 'find',
    });

    return {
      ok: true,
      runId,
      stage: 'find',
      outputPaths,
      costUsd: 0,
    };
  }

  // Real mode — use already-read schematics
  const schematicsContent = JSON.stringify(schematics, null, 2);

  const roleSkill = await loadRoleSkill('find');

  const runCard = {
    contract_type: 'forked_agent' as const,
    run_id: runId,
    agent_id: `find-${runId}`,
    stage: 'find' as const,
    role: 'find',
    thread_mode: 'forked' as const,
    model: 'claude-opus-4-6',
    thread: {
      parent_thread_id: null,
      fork_root_thread_id: null,
      fork_path: null,
      fork_depth: null,
      fork_reason: null,
      max_turns: 20,
    },
    inputs: [
      {
        handle: 'cathedral_schematics',
        path: paths.cathedral.schematics,
        required: true,
        format: 'json' as const,
        schema_ref: null,
        owner_role: 'cathedral',
      },
    ],
    outputs: [
      {
        handle: 'convergence_matrix',
        path: paths.find.convergenceMatrix,
        required: true,
        format: 'json' as const,
        schema_ref: null,
        owner_role: 'find',
      },
    ],
    rules: [
      'Only report findings with direct evidence in the source code.',
      'Each finding must map to a specific, locatable artifact.',
    ],
    acceptance_checks: [
      { description: 'convergence-matrix.json must be valid JSON', required: true },
    ],
    next_consumer: { role: 'distill-challenger', stage: 'distill' },
  };

  const payload = `Analyze findings for: ${targetPath}\nLevel: ${level}\n\nSchematics:\n${schematicsContent}`;

  const assembled = assemblePrompt({
    roleSkill,
    runCard: JSON.stringify(runCard, null, 2),
    payload,
    tokenBudget: 4650,
  });

  if (!assembled.ok) {
    return {
      ok: false,
      runId,
      stage: 'find',
      outputPaths: {},
      costUsd: 0,
      error: assembled.reason,
    };
  }

  const result = await runWithSDK({
    runCard,
    assembledPrompt: assembled.prompt!,
    payload,
  });

  if (!result.ok) {
    return {
      ok: false,
      runId,
      stage: 'find',
      outputPaths: {},
      costUsd: result.costUsd,
      error: result.error,
    };
  }

  await spine.emit({
    event_type: 'UNIT_COMPLETE',
    run_id: runId,
    agent_id: `find-${runId}`,
    stage: 'find',
    role: 'find',
  });

  return {
    ok: true,
    runId,
    stage: 'find',
    outputPaths: { convergence_matrix: paths.find.convergenceMatrix },
    costUsd: result.costUsd,
  };
}
