import fs from 'fs/promises';
import path from 'path';
import { Paths } from '../../core/paths.js';
import { StageResult } from '../../core/types.js';
import { EventSpine } from '../../enforcement/events.js';
import { loadRoleSkill } from '../../runner/role-loader.js';
import { assemblePrompt } from '../../enforcement/prompt-assembler.js';
import { runWithSDK } from '../../runner/sdk-runner.js';

async function getFid8sFromPredict(paths: Paths): Promise<string[]> {
  const approvedDir = path.dirname(paths.predict.approved('x'));
  try {
    const files = await fs.readdir(approvedDir);
    return files
      .filter((f) => f.endsWith('.packet.json'))
      .map((f) => f.split('.')[0]);
  } catch {
    return [];
  }
}

export async function runPropose(opts: {
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
    agent_id: `propose-${runId}`,
    stage: 'propose',
    role: 'propose-architect',
  });

  const fid8s = await getFid8sFromPredict(paths);

  if (fid8s.length === 0) {
    return {
      ok: false,
      runId,
      stage: 'propose',
      outputPaths: {},
      costUsd: 0,
      error: 'INPUT_VALIDATION_FAILED: no approved predict packets found',
    };
  }

  if (dryRun) {
    const outputPaths: Record<string, string> = {};

    for (const fid8 of fid8s) {
      const branch = 'a';
      const proposalPath = paths.propose.proposal(fid8, branch);
      const approvedPath = paths.propose.approved(fid8, branch);

      await fs.mkdir(path.dirname(proposalPath), { recursive: true });
      await fs.mkdir(path.dirname(approvedPath), { recursive: true });

      await fs.writeFile(
        proposalPath,
        JSON.stringify(
          {
            fid8,
            branch,
            run_id: runId,
            summary: `Stub proposal for ${fid8}`,
            approach: 'Fix the identified issue with minimal footprint.',
            file_changes: [],
            required_tests: [],
            migration_steps: [],
            effort: 'low',
            confidence: 0.8,
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
            branch,
            run_id: runId,
            stage: 'propose',
            packet_type: 'propose_approved',
            generated_at: new Date().toISOString(),
          },
          null,
          2,
        ),
        'utf-8',
      );

      outputPaths[`proposal_${fid8}`] = proposalPath;
      outputPaths[`approved_${fid8}`] = approvedPath;
    }

    await spine.emit({
      event_type: 'UNIT_COMPLETE',
      run_id: runId,
      agent_id: `propose-${runId}`,
      stage: 'propose',
      role: 'propose-architect',
    });

    return {
      ok: true,
      runId,
      stage: 'propose',
      outputPaths,
      costUsd: 0,
    };
  }

  // Real mode
  const roleSkill = await loadRoleSkill('propose-architect');
  let totalCost = 0;

  for (const fid8 of fid8s) {
    const branch = 'a';
    const proposalPath = paths.propose.proposal(fid8, branch);
    const approvedPath = paths.propose.approved(fid8, branch);

    const runCard = {
      contract_type: 'forked_agent' as const,
      run_id: runId,
      agent_id: `propose-${fid8}`,
      stage: 'propose' as const,
      role: 'propose-architect',
      thread_mode: 'forked' as const,
      model: 'claude-opus-4-6',
      thread: { parent_thread_id: null, fork_root_thread_id: null, fork_path: null, fork_depth: null, fork_reason: null, max_turns: 15 },
      inputs: [{ handle: 'predict_packet', path: paths.predict.approved(fid8), required: true, format: 'json' as const, schema_ref: null, owner_role: 'predict' }],
      outputs: [{ handle: 'proposal', path: proposalPath, required: true, format: 'json' as const, schema_ref: null, owner_role: 'propose-architect' }],
      rules: ['Only propose changes within the declared target path.'],
      acceptance_checks: [{ description: 'proposal must be valid JSON', required: true }],
      next_consumer: { role: 'implement-holistic', stage: 'implement' },
    };

    const assembled = assemblePrompt({
      roleSkill,
      runCard: JSON.stringify(runCard, null, 2),
      payload: `Design proposal for finding ${fid8}, run ${runId}`,
      tokenBudget: 4650,
    });

    if (!assembled.ok) {
      return { ok: false, runId, stage: 'propose', outputPaths: {}, costUsd: totalCost, error: assembled.reason };
    }

    const result = await runWithSDK({
      runCard,
      assembledPrompt: assembled.prompt!,
      payload: `Design proposal for finding ${fid8}`,
    });

    totalCost += result.costUsd;
    if (!result.ok) {
      return { ok: false, runId, stage: 'propose', outputPaths: {}, costUsd: totalCost, error: result.error };
    }

    // Write approved packet
    await fs.mkdir(path.dirname(approvedPath), { recursive: true });
    await fs.writeFile(
      approvedPath,
      JSON.stringify({ fid8, branch, run_id: runId, stage: 'propose', packet_type: 'propose_approved', generated_at: new Date().toISOString() }, null, 2),
      'utf-8',
    );
  }

  await spine.emit({
    event_type: 'UNIT_COMPLETE',
    run_id: runId,
    agent_id: `propose-${runId}`,
    stage: 'propose',
    role: 'propose-architect',
  });

  return {
    ok: true,
    runId,
    stage: 'propose',
    outputPaths: {},
    costUsd: totalCost,
  };
}
