import fs from 'fs/promises';
import path from 'path';
import { Paths } from '../../core/paths.js';
import { StageResult } from '../../core/types.js';
import { EventSpine } from '../../enforcement/events.js';
import { adjudicate } from './adjudicator.js';
import { loadRoleSkill } from '../../runner/role-loader.js';
import { assemblePrompt } from '../../enforcement/prompt-assembler.js';
import { runWithSDK } from '../../runner/sdk-runner.js';

interface ConvergenceMatrix {
  run_id: string;
  findings: Array<{ fid8: string; status: string }>;
}

export async function runDistill(opts: {
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
    agent_id: `distill-${runId}`,
    stage: 'distill',
    role: 'distill-challenger',
  });

  // Read convergence matrix to get fid8 list
  let matrix: ConvergenceMatrix;
  try {
    const raw = await fs.readFile(paths.find.convergenceMatrix, 'utf-8');
    matrix = JSON.parse(raw) as ConvergenceMatrix;
  } catch {
    return {
      ok: false,
      runId,
      stage: 'distill',
      outputPaths: {},
      costUsd: 0,
      error: 'INPUT_VALIDATION_FAILED: convergence-matrix.json not found',
    };
  }

  const fid8s = matrix.findings.map((f) => f.fid8);

  if (dryRun) {
    const outputPaths: Record<string, string> = {};

    for (const fid8 of fid8s) {
      // Create stub challenge votes and adjudicate
      const stubVotes = [
        { supports: true, weakens: false },
        { supports: true, weakens: false },
        { supports: true, weakens: false },
      ];
      const adjResult = adjudicate(stubVotes);

      const verdictPath = paths.distill.verdict(fid8);
      const challengePath = paths.distill.challenge(fid8);
      const approvedPath = paths.distill.approved(fid8);

      await fs.mkdir(path.dirname(verdictPath), { recursive: true });
      await fs.mkdir(path.dirname(challengePath), { recursive: true });
      await fs.mkdir(path.dirname(approvedPath), { recursive: true });

      await fs.writeFile(
        verdictPath,
        JSON.stringify(
          {
            fid8,
            run_id: runId,
            verdict: adjResult.verdict,
            confidence: adjResult.confidence,
            votes: stubVotes,
            generated_at: new Date().toISOString(),
          },
          null,
          2,
        ),
        'utf-8',
      );

      await fs.writeFile(
        challengePath,
        `# Challenge: ${fid8}\n\nVerdict: **${adjResult.verdict}**\nConfidence: ${adjResult.confidence}\n\nDry-run challenge stub.\n`,
        'utf-8',
      );

      await fs.writeFile(
        approvedPath,
        JSON.stringify(
          {
            fid8,
            run_id: runId,
            stage: 'distill',
            verdict: adjResult.verdict,
            approved: adjResult.verdict === 'approve',
            packet_type: 'distill_approved',
            generated_at: new Date().toISOString(),
          },
          null,
          2,
        ),
        'utf-8',
      );

      outputPaths[`verdict_${fid8}`] = verdictPath;
      outputPaths[`challenge_${fid8}`] = challengePath;
      outputPaths[`approved_${fid8}`] = approvedPath;
    }

    await spine.emit({
      event_type: 'UNIT_COMPLETE',
      run_id: runId,
      agent_id: `distill-${runId}`,
      stage: 'distill',
      role: 'distill-challenger',
    });

    return {
      ok: true,
      runId,
      stage: 'distill',
      outputPaths,
      costUsd: 0,
    };
  }

  // Real mode
  const roleSkill = await loadRoleSkill('distill-challenger');

  const runCard = {
    contract_type: 'forked_agent' as const,
    run_id: runId,
    agent_id: `distill-${runId}`,
    stage: 'distill' as const,
    role: 'distill-challenger',
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
        handle: 'convergence_matrix',
        path: paths.find.convergenceMatrix,
        required: true,
        format: 'json' as const,
        schema_ref: null,
        owner_role: 'find',
      },
    ],
    outputs: [],
    rules: ['Challenge each finding with adversarial scrutiny.'],
    acceptance_checks: [
      { description: 'Each fid8 must have a verdict file', required: true },
    ],
    next_consumer: { role: 'predict-da', stage: 'predict' },
  };

  const payload = `Run distillation for run_id: ${runId}\nFindings: ${fid8s.join(', ')}`;

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
      stage: 'distill',
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
      stage: 'distill',
      outputPaths: {},
      costUsd: result.costUsd,
      error: result.error,
    };
  }

  // Post-process: read verdict files the LLM wrote, create formal approved packets.
  // The LLM writes distill/verdicts/<fid8>.json — code converts them to approved packets.
  const outputPaths: Record<string, string> = {};
  for (const fid8 of fid8s) {
    const verdictPath = paths.distill.verdict(fid8);
    let verdict: { suggested_action?: string; supports?: boolean; weakens?: boolean } = {};
    try {
      const raw = await fs.readFile(verdictPath, 'utf-8');
      verdict = JSON.parse(raw);
    } catch {
      // Verdict file not written by LLM — skip this fid8
      continue;
    }

    const approved = verdict.suggested_action === 'approve' ||
      (verdict.supports === true && verdict.weakens !== true);

    const approvedPath = paths.distill.approved(fid8);
    await fs.mkdir(path.dirname(approvedPath), { recursive: true });
    await fs.writeFile(
      approvedPath,
      JSON.stringify({
        fid8,
        run_id: runId,
        stage: 'distill',
        verdict: approved ? 'approve' : 'reject',
        approved,
        packet_type: 'distill_approved',
        generated_at: new Date().toISOString(),
      }, null, 2),
      'utf-8',
    );
    outputPaths[`approved_${fid8}`] = approvedPath;
  }

  await spine.emit({
    event_type: 'UNIT_COMPLETE',
    run_id: runId,
    agent_id: `distill-${runId}`,
    stage: 'distill',
    role: 'distill-challenger',
  });

  return {
    ok: true,
    runId,
    stage: 'distill',
    outputPaths,
    costUsd: result.costUsd,
  };
}
