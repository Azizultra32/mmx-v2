import fs from 'fs/promises';
import path from 'path';
import { Paths } from '../../core/paths.js';
import { StageResult } from '../../core/types.js';
import { EventSpine } from '../../enforcement/events.js';
import { loadRoleSkill } from '../../runner/role-loader.js';
import { assemblePrompt } from '../../enforcement/prompt-assembler.js';
import { runWithSDK } from '../../runner/sdk-runner.js';

async function getFid8sFromPropose(paths: Paths): Promise<string[]> {
  // Look in propose/approved for *.a.packet.json files
  const baseApproved = path.dirname(paths.propose.approved('x', 'a'));
  try {
    const files = await fs.readdir(baseApproved);
    // Files are like {fid8}.a.packet.json — extract unique fid8s
    const fid8Set = new Set<string>();
    for (const f of files) {
      if (f.endsWith('.packet.json')) {
        fid8Set.add(f.split('.')[0]);
      }
    }
    return Array.from(fid8Set);
  } catch {
    return [];
  }
}

async function writeIFR(
  paths: Paths,
  fid8: string,
  runId: string,
  cycle: number,
  failureReason: string,
  remediationSuggestion: string,
): Promise<void> {
  const ifrPath = paths.implement.ifr(fid8, cycle);
  await fs.mkdir(path.dirname(ifrPath), { recursive: true });
  await fs.writeFile(
    ifrPath,
    JSON.stringify(
      {
        fid8,
        run_id: runId,
        cycle,
        failure_reason: failureReason,
        remediation_suggestion: remediationSuggestion,
        generated_at: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf-8',
  );
}

export async function runImplement(opts: {
  targetPath: string;
  runId: string;
  dryRun?: boolean;
}): Promise<StageResult> {
  const { targetPath, runId, dryRun } = opts;
  const paths = new Paths(targetPath, runId);
  const spine = new EventSpine(paths.events.activity);

  await spine.emit({
    event_type: 'DISPATCH_STARTED',
    run_id: runId,
    agent_id: `implement-${runId}`,
    stage: 'implement',
    role: 'implement-holistic',
  });

  const fid8s = await getFid8sFromPropose(paths);

  if (fid8s.length === 0) {
    return {
      ok: false,
      runId,
      stage: 'implement',
      outputPaths: {},
      costUsd: 0,
      error: 'INPUT_VALIDATION_FAILED: no approved propose packets found',
    };
  }

  if (dryRun) {
    const outputPaths: Record<string, string> = {};

    for (const fid8 of fid8s) {
      const cycle = 1;
      const patchPath = paths.implement.patch(fid8, cycle);
      const testsPath = paths.implement.tests(fid8, cycle);
      const factsPath = paths.implement.facts(fid8, cycle);
      const approvedPath = paths.implement.approved(fid8);

      await fs.mkdir(path.dirname(patchPath), { recursive: true });
      await fs.mkdir(path.dirname(testsPath), { recursive: true });
      await fs.mkdir(path.dirname(factsPath), { recursive: true });
      await fs.mkdir(path.dirname(approvedPath), { recursive: true });

      await fs.writeFile(
        patchPath,
        `--- a/stub.ts\n+++ b/stub.ts\n@@ -1,1 +1,2 @@\n // stub\n+// fix applied for ${fid8}\n`,
        'utf-8',
      );

      await fs.writeFile(
        testsPath,
        JSON.stringify(
          {
            fid8,
            run_id: runId,
            cycle,
            tests_added: 1,
            tests_modified: 0,
            test_files: [`stub.test.ts`],
            all_pass: true,
            generated_at: new Date().toISOString(),
          },
          null,
          2,
        ),
        'utf-8',
      );

      await fs.writeFile(
        factsPath,
        JSON.stringify(
          {
            fid8,
            run_id: runId,
            cycle,
            files_modified: ['stub.ts'],
            files_added: [],
            files_deleted: [],
            tests_added: 1,
            tests_modified: 0,
            invariants_verified: ['No existing tests broken'],
            deviations_from_proposal: [],
            generated_at: new Date().toISOString(),
          },
          null,
          2,
        ),
        'utf-8',
      );

      await fs.writeFile(
        approvedPath,
        JSON.stringify(
          {
            fid8,
            run_id: runId,
            stage: 'implement',
            packet_type: 'implement_approved',
            cycle,
            generated_at: new Date().toISOString(),
          },
          null,
          2,
        ),
        'utf-8',
      );

      outputPaths[`patch_${fid8}`] = patchPath;
      outputPaths[`tests_${fid8}`] = testsPath;
      outputPaths[`facts_${fid8}`] = factsPath;
      outputPaths[`approved_${fid8}`] = approvedPath;
    }

    await spine.emit({
      event_type: 'UNIT_COMPLETE',
      run_id: runId,
      agent_id: `implement-${runId}`,
      stage: 'implement',
      role: 'implement-holistic',
    });

    return {
      ok: true,
      runId,
      stage: 'implement',
      outputPaths,
      costUsd: 0,
    };
  }

  // Real mode
  const roleSkill = await loadRoleSkill('implement-holistic');
  let totalCost = 0;

  for (const fid8 of fid8s) {
    const cycle = 1;
    const patchPath = paths.implement.patch(fid8, cycle);
    const testsPath = paths.implement.tests(fid8, cycle);
    const factsPath = paths.implement.facts(fid8, cycle);
    const approvedPath = paths.implement.approved(fid8);

    const runCard = {
      contract_type: 'forked_agent' as const,
      run_id: runId,
      agent_id: `implement-${fid8}`,
      stage: 'implement' as const,
      role: 'implement-holistic',
      thread_mode: 'forked' as const,
      model: 'claude-opus-4-6',
      thread: { parent_thread_id: null, fork_root_thread_id: null, fork_path: null, fork_depth: null, fork_reason: null, max_turns: 20 },
      inputs: [{ handle: 'propose_packet', path: paths.propose.approved(fid8, 'a'), required: true, format: 'json' as const, schema_ref: null, owner_role: 'propose' }],
      outputs: [
        { handle: 'patch', path: patchPath, required: true, format: 'diff' as const, schema_ref: null, owner_role: 'implement-holistic' },
        { handle: 'tests', path: testsPath, required: true, format: 'json' as const, schema_ref: null, owner_role: 'implement-holistic' },
        { handle: 'facts', path: factsPath, required: true, format: 'json' as const, schema_ref: null, owner_role: 'implement-holistic' },
      ],
      rules: ['Only modify files within the declared target path.', 'Emit IFR on failure.'],
      acceptance_checks: [{ description: 'patch must apply cleanly', required: true }],
      next_consumer: { role: 'finalguard', stage: 'finalguard' },
    };

    const assembled = assemblePrompt({
      roleSkill,
      runCard: JSON.stringify(runCard, null, 2),
      payload: `Implement fix for finding ${fid8}, run ${runId}`,
      tokenBudget: 4650,
    });

    if (!assembled.ok) {
      await writeIFR(paths, fid8, runId, cycle, assembled.reason ?? 'PROMPT_BUDGET_EXCEEDED', 'Reduce prompt size or increase token budget.');
      return { ok: false, runId, stage: 'implement', outputPaths: {}, costUsd: totalCost, error: assembled.reason };
    }

    // cwd = stage output dir so agent defaults to writing in workspace.
    // Source files are read-only — agent must write ONLY unified diffs to
    // the declared patch path. It must NOT modify source files directly.
    const stageWorkspace = path.dirname(patchPath);
    await fs.mkdir(stageWorkspace, { recursive: true });

    const result = await runWithSDK({
      runCard,
      assembledPrompt: assembled.prompt!,
      payload: [
        `Implement fix for finding ${fid8} in run ${runId}.`,
        `Target repo: ${targetPath}`,
        `Read source files from ${targetPath} to understand the code.`,
        `Write ONLY a unified diff (git diff format) to: ${patchPath}`,
        `Write ONLY test cases JSON to: ${testsPath}`,
        `Write ONLY facts JSON to: ${factsPath}`,
        `DO NOT modify any source file in ${targetPath} directly.`,
        `DO NOT write files anywhere except the declared output paths above.`,
      ].join('\n'),
      cwd: stageWorkspace,
    });

    totalCost += result.costUsd;

    if (!result.ok) {
      await writeIFR(paths, fid8, runId, cycle, result.error ?? 'SDK_ERROR', 'Retry with reduced context or manual implementation.');
      return { ok: false, runId, stage: 'implement', outputPaths: {}, costUsd: totalCost, error: result.error };
    }

    // Write approved packet
    await fs.mkdir(path.dirname(approvedPath), { recursive: true });
    await fs.writeFile(
      approvedPath,
      JSON.stringify({ fid8, run_id: runId, stage: 'implement', packet_type: 'implement_approved', cycle, generated_at: new Date().toISOString() }, null, 2),
      'utf-8',
    );
  }

  await spine.emit({
    event_type: 'UNIT_COMPLETE',
    run_id: runId,
    agent_id: `implement-${runId}`,
    stage: 'implement',
    role: 'implement-holistic',
  });

  return {
    ok: true,
    runId,
    stage: 'implement',
    outputPaths: {},
    costUsd: totalCost,
  };
}
