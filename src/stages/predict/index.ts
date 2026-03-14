import fs from 'fs/promises';
import path from 'path';
import { Paths } from '../../core/paths.js';
import { StageResult } from '../../core/types.js';
import { EventSpine } from '../../enforcement/events.js';
import { loadRoleSkill } from '../../runner/role-loader.js';
import { assemblePrompt } from '../../enforcement/prompt-assembler.js';
import { runWithSDK } from '../../runner/sdk-runner.js';

interface DistillPacket {
  fid8: string;
  run_id: string;
  approved: boolean;
}

async function getFid8sFromDistill(paths: Paths): Promise<string[]> {
  const approvedDir = path.join(
    path.dirname(paths.distill.approved('x')),
  );
  try {
    const files = await fs.readdir(approvedDir);
    return files
      .filter((f) => f.endsWith('.packet.json'))
      .map((f) => f.split('.')[0]);
  } catch {
    return [];
  }
}

export async function runPredict(opts: {
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
    agent_id: `predict-${runId}`,
    stage: 'predict',
    role: 'predict-da',
  });

  const fid8s = await getFid8sFromDistill(paths);

  if (fid8s.length === 0) {
    return {
      ok: false,
      runId,
      stage: 'predict',
      outputPaths: {},
      costUsd: 0,
      error: 'INPUT_VALIDATION_FAILED: no approved distill packets found',
    };
  }

  if (dryRun) {
    const outputPaths: Record<string, string> = {};

    // Process all fid8s in parallel
    await Promise.all(
      fid8s.map(async (fid8) => {
        const daPath = paths.predict.da(fid8);
        const fsmPath = paths.predict.fsm(fid8);
        const g5Path = paths.predict.g5(fid8);
        const simverifyPath = paths.predict.simverify(fid8);
        const approvedPath = paths.predict.approved(fid8);

        await fs.mkdir(path.dirname(daPath), { recursive: true });
        await fs.mkdir(path.dirname(fsmPath), { recursive: true });
        await fs.mkdir(path.dirname(g5Path), { recursive: true });
        await fs.mkdir(path.dirname(simverifyPath), { recursive: true });
        await fs.mkdir(path.dirname(approvedPath), { recursive: true });

        const base = { fid8, run_id: runId, generated_at: new Date().toISOString() };

        await Promise.all([
          fs.writeFile(
            daPath,
            JSON.stringify({ ...base, callers: [], consumers: [], shared_state_risks: [], interface_contracts: [], test_coverage_files: [], dependency_risk_score: 0.1 }, null, 2),
            'utf-8',
          ),
          fs.writeFile(
            fsmPath,
            JSON.stringify({ ...base, states: ['idle', 'running', 'done'], transitions: [], invalid_states: [], invariants: [], edge_conditions: [], complexity_score: 0.1 }, null, 2),
            'utf-8',
          ),
          fs.writeFile(
            g5Path,
            JSON.stringify({ ...base, direct_consequences: ['Fix applied'], second_order: [], third_order: [], regression_risks: [], opportunity_effects: [], confidence_score: 0.8 }, null, 2),
            'utf-8',
          ),
          fs.writeFile(
            simverifyPath,
            JSON.stringify({ ...base, reproduction_steps: ['Run tests'], test_scenarios: [], boundary_conditions: [], fix_verification_criteria: ['Tests pass'], estimated_test_effort: 'low' }, null, 2),
            'utf-8',
          ),
          fs.writeFile(
            approvedPath,
            JSON.stringify({ fid8, run_id: runId, stage: 'predict', packet_type: 'predict_approved', generated_at: new Date().toISOString() }, null, 2),
            'utf-8',
          ),
        ]);

        outputPaths[`da_${fid8}`] = daPath;
        outputPaths[`fsm_${fid8}`] = fsmPath;
        outputPaths[`g5_${fid8}`] = g5Path;
        outputPaths[`simverify_${fid8}`] = simverifyPath;
        outputPaths[`approved_${fid8}`] = approvedPath;
      }),
    );

    await spine.emit({
      event_type: 'UNIT_COMPLETE',
      run_id: runId,
      agent_id: `predict-${runId}`,
      stage: 'predict',
      role: 'predict-da',
    });

    return {
      ok: true,
      runId,
      stage: 'predict',
      outputPaths,
      costUsd: 0,
    };
  }

  // Real mode — run 4 subroles in parallel for each fid8
  const roleSkills = await Promise.all([
    loadRoleSkill('predict-da'),
    loadRoleSkill('predict-fsm'),
    loadRoleSkill('predict-g5'),
    loadRoleSkill('predict-simverify'),
  ]);

  // Parallel: all fid8s run concurrently — each is independent, unique output paths
  const fid8Results = await Promise.all(fid8s.map(async (fid8) => {
    const subroles = ['da', 'fsm', 'g5', 'simverify'] as const;

    const subroleResults = await Promise.all(
      subroles.map(async (subrole, i) => {
        const outputPath = paths.predict[subrole](fid8);
        const runCard = {
          contract_type: 'forked_agent' as const,
          run_id: runId,
          agent_id: `predict-${subrole}-${fid8}`,
          stage: 'predict' as const,
          role: `predict-${subrole}`,
          thread_mode: 'forked' as const,
          model: 'claude-opus-4-6',
          thread: { parent_thread_id: null, fork_root_thread_id: null, fork_path: null, fork_depth: null, fork_reason: null, max_turns: 10 },
          inputs: [{ handle: 'distill_packet', path: paths.distill.approved(fid8), required: true, format: 'json' as const, schema_ref: null, owner_role: 'distill' }],
          outputs: [{ handle: subrole, path: outputPath, required: true, format: 'json' as const, schema_ref: null, owner_role: `predict-${subrole}` }],
          rules: ['Produce output exactly in declared format.'],
          acceptance_checks: [{ description: `${subrole} output must be valid JSON`, required: true }],
          next_consumer: { role: 'propose-architect', stage: 'propose' },
        };

        const assembled = assemblePrompt({
          roleSkill: roleSkills[i],
          runCard: JSON.stringify(runCard, null, 2),
          payload: `Analyze finding ${fid8} for run ${runId}`,
          tokenBudget: 4650,
        });

        if (!assembled.ok) return { ok: false, costUsd: 0, error: assembled.reason };

        return runWithSDK({ runCard, assembledPrompt: assembled.prompt!, payload: `Analyze finding ${fid8}` });
      }),
    );

    const failed = subroleResults.find(r => !r.ok);
    if (failed) return { ok: false as const, fid8, costUsd: subroleResults.reduce((s, r) => s + r.costUsd, 0), error: failed.error };

    // Write approved packet
    const approvedPath = paths.predict.approved(fid8);
    await fs.mkdir(path.dirname(approvedPath), { recursive: true });
    await fs.writeFile(
      approvedPath,
      JSON.stringify({ fid8, run_id: runId, stage: 'predict', packet_type: 'predict_approved', generated_at: new Date().toISOString() }, null, 2),
      'utf-8',
    );

    return { ok: true as const, fid8, costUsd: subroleResults.reduce((s, r) => s + r.costUsd, 0) };
  }));

  const totalCost = fid8Results.reduce((s, r) => s + r.costUsd, 0);
  const failed = fid8Results.find(r => !r.ok);
  if (failed) return { ok: false, runId, stage: 'predict', outputPaths: {}, costUsd: totalCost, error: failed.error };

  await spine.emit({
    event_type: 'UNIT_COMPLETE',
    run_id: runId,
    agent_id: `predict-${runId}`,
    stage: 'predict',
    role: 'predict-da',
  });

  return {
    ok: true,
    runId,
    stage: 'predict',
    outputPaths: {},
    costUsd: totalCost,
  };
}
