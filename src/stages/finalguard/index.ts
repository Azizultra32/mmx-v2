import fs from 'fs/promises';
import path from 'path';
import { Paths } from '../../core/paths.js';
import { StageResult } from '../../core/types.js';
import { EventSpine } from '../../enforcement/events.js';
import { loadRoleSkill } from '../../runner/role-loader.js';
import { assemblePrompt } from '../../enforcement/prompt-assembler.js';
import { runWithSDK } from '../../runner/sdk-runner.js';

async function getFid8sFromImplement(paths: Paths): Promise<string[]> {
  const approvedDir = path.dirname(paths.implement.approved('x'));
  try {
    const files = await fs.readdir(approvedDir);
    return files
      .filter((f) => f.endsWith('.packet.json'))
      .map((f) => f.split('.')[0]);
  } catch {
    return [];
  }
}

export async function runFinalGuard(opts: {
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
    agent_id: `finalguard-${runId}`,
    stage: 'finalguard',
    role: 'finalguard',
  });

  const fid8s = await getFid8sFromImplement(paths);

  if (fid8s.length === 0) {
    return {
      ok: false,
      runId,
      stage: 'finalguard',
      outputPaths: {},
      costUsd: 0,
      error: 'INPUT_VALIDATION_FAILED: no approved implement packets found',
    };
  }

  if (dryRun) {
    const outputPaths: Record<string, string> = {};

    for (const fid8 of fid8s) {
      const verdictPath = paths.finalguard.verdict(fid8);
      const notesPath = paths.finalguard.notes(fid8);
      const receiptPath = paths.finalguard.receipt(fid8);

      await fs.mkdir(path.dirname(verdictPath), { recursive: true });
      await fs.mkdir(path.dirname(notesPath), { recursive: true });
      await fs.mkdir(path.dirname(receiptPath), { recursive: true });

      const reviewedAt = new Date().toISOString();

      await fs.writeFile(
        verdictPath,
        JSON.stringify(
          {
            fid8,
            run_id: runId,
            verdict: 'approve',
            confidence: 0.9,
            issues_found: [],
            revision_instructions: [],
            reviewed_at: reviewedAt,
          },
          null,
          2,
        ),
        'utf-8',
      );

      await fs.writeFile(
        notesPath,
        `# FinalGuard Review: ${fid8}\n\nVerdict: **approve**\nReviewed at: ${reviewedAt}\n\nDry-run review — no issues found.\n`,
        'utf-8',
      );

      await fs.writeFile(
        receiptPath,
        `<!DOCTYPE html>
<html>
<head><title>FinalGuard Receipt — ${fid8}</title></head>
<body>
<h1>FinalGuard Receipt</h1>
<p><strong>Finding ID:</strong> ${fid8}</p>
<p><strong>Run ID:</strong> ${runId}</p>
<p><strong>Verdict:</strong> approve</p>
<p><strong>Reviewed At:</strong> ${reviewedAt}</p>
<p><em>Dry-run mode — no real review performed.</em></p>
</body>
</html>`,
        'utf-8',
      );

      outputPaths[`verdict_${fid8}`] = verdictPath;
      outputPaths[`notes_${fid8}`] = notesPath;
      outputPaths[`receipt_${fid8}`] = receiptPath;
    }

    await spine.emit({
      event_type: 'UNIT_COMPLETE',
      run_id: runId,
      agent_id: `finalguard-${runId}`,
      stage: 'finalguard',
      role: 'finalguard',
    });

    return {
      ok: true,
      runId,
      stage: 'finalguard',
      outputPaths,
      costUsd: 0,
    };
  }

  // Real mode
  const roleSkill = await loadRoleSkill('finalguard');

  // Parallel: all fid8s reviewed concurrently — each writes to unique workspace paths
  const fid8Results = await Promise.all(fid8s.map(async (fid8) => {
    const verdictPath = paths.finalguard.verdict(fid8);
    const notesPath = paths.finalguard.notes(fid8);
    const receiptPath = paths.finalguard.receipt(fid8);

    const runCard = {
      contract_type: 'forked_agent' as const,
      run_id: runId,
      agent_id: `finalguard-${fid8}`,
      stage: 'finalguard' as const,
      role: 'finalguard',
      thread_mode: 'forked' as const,
      model: 'claude-opus-4-6',
      thread: { parent_thread_id: null, fork_root_thread_id: null, fork_path: null, fork_depth: null, fork_reason: null, max_turns: 15 },
      inputs: [{ handle: 'implement_packet', path: paths.implement.approved(fid8), required: true, format: 'json' as const, schema_ref: null, owner_role: 'implement' }],
      outputs: [
        { handle: 'verdict', path: verdictPath, required: true, format: 'json' as const, schema_ref: null, owner_role: 'finalguard' },
        { handle: 'notes', path: notesPath, required: true, format: 'markdown' as const, schema_ref: null, owner_role: 'finalguard' },
        { handle: 'receipt', path: receiptPath, required: true, format: 'html' as const, schema_ref: null, owner_role: 'finalguard' },
      ],
      rules: ['Apply adversarial rigor. Only approve correct, complete implementations.'],
      acceptance_checks: [{ description: 'verdict must be approve|reject|needs_revision', required: true }],
      next_consumer: { role: null, stage: 'humangate' },
    };

    const assembled = assemblePrompt({
      roleSkill,
      runCard: JSON.stringify(runCard, null, 2),
      payload: `Final review for finding ${fid8}, run ${runId}`,
      tokenBudget: 4650,
    });

    if (!assembled.ok) return { ok: false as const, costUsd: 0, error: assembled.reason };

    const result = await runWithSDK({
      runCard,
      assembledPrompt: assembled.prompt!,
      payload: [
        `Final review for finding ${fid8}, run ${runId}.`,
        `Read patch from: ${paths.implement.patch(fid8, 1)}`,
        `Write verdict JSON to: ${verdictPath}`,
        `Write notes markdown to: ${notesPath}`,
        `Write receipt HTML to: ${receiptPath}`,
        `DO NOT modify any source files. Read only. Write only to declared output paths.`,
      ].join('\n'),
      // No cwd override — runs from engine dir so SDK can find its cli.js.
      // All paths in payload are absolute so cwd doesn't affect file access.
    });

    return result.ok
      ? { ok: true as const, costUsd: result.costUsd }
      : { ok: false as const, costUsd: result.costUsd, error: result.error };
  }));

  const totalCost = fid8Results.reduce((s, r) => s + r.costUsd, 0);
  const failed = fid8Results.find(r => !r.ok);
  if (failed) return { ok: false, runId, stage: 'finalguard', outputPaths: {}, costUsd: totalCost, error: failed.error };

  await spine.emit({
    event_type: 'UNIT_COMPLETE',
    run_id: runId,
    agent_id: `finalguard-${runId}`,
    stage: 'finalguard',
    role: 'finalguard',
  });

  return {
    ok: true,
    runId,
    stage: 'finalguard',
    outputPaths: {},
    costUsd: totalCost,
  };
}
