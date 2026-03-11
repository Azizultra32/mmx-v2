import fs from 'fs/promises';
import path from 'path';
import { Paths } from '../../core/paths.js';
import { StageResult } from '../../core/types.js';
import { EventSpine } from '../../enforcement/events.js';
import { generateFid8 } from '../../core/fid8.js';
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

  if (dryRun) {
    const fid8s = [generateFid8(), generateFid8()];
    const outputPaths: Record<string, string> = {};

    for (const fid8 of fid8s) {
      const rawPath = paths.find.raw(fid8);
      const mergedPath = paths.find.merged(fid8);
      const convergencePath = paths.find.convergence(fid8);

      await fs.mkdir(path.dirname(rawPath), { recursive: true });
      await fs.mkdir(path.dirname(mergedPath), { recursive: true });
      await fs.mkdir(path.dirname(convergencePath), { recursive: true });

      const stubFinding = {
        fid8,
        run_id: runId,
        severity: 'medium',
        category: 'quality',
        title: `Stub finding ${fid8}`,
        description: 'Dry-run stub finding for testing.',
        location: { file: 'stub.ts', line: 1 },
        evidence: '// stub',
        impact: 'None in dry-run mode.',
        generated_at: new Date().toISOString(),
      };

      await fs.writeFile(rawPath, JSON.stringify(stubFinding, null, 2), 'utf-8');
      await fs.writeFile(mergedPath, JSON.stringify({ ...stubFinding, merged: true }, null, 2), 'utf-8');
      await fs.writeFile(
        convergencePath,
        JSON.stringify({ ...stubFinding, convergence_status: 'converged', vote_count: 3 }, null, 2),
        'utf-8',
      );

      outputPaths[`raw_${fid8}`] = rawPath;
      outputPaths[`merged_${fid8}`] = mergedPath;
      outputPaths[`convergence_${fid8}`] = convergencePath;
    }

    // Write convergence matrix
    await fs.mkdir(path.dirname(paths.find.convergenceMatrix), { recursive: true });
    const matrix = {
      run_id: runId,
      findings: fid8s.map((fid8) => ({ fid8, status: 'converged' })),
      generated_at: new Date().toISOString(),
    };
    await fs.writeFile(paths.find.convergenceMatrix, JSON.stringify(matrix, null, 2), 'utf-8');
    outputPaths['convergence_matrix'] = paths.find.convergenceMatrix;

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

  // Real mode — read cathedral schematics first
  let schematicsContent: string;
  try {
    schematicsContent = await fs.readFile(paths.cathedral.schematics, 'utf-8');
  } catch {
    return {
      ok: false,
      runId,
      stage: 'find',
      outputPaths: {},
      costUsd: 0,
      error: 'INPUT_VALIDATION_FAILED: cathedral schematics not found',
    };
  }

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
