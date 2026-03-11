import fs from 'fs/promises';
import path from 'path';
import { Paths } from '../../core/paths.js';
import { StageResult } from '../../core/types.js';
import { EventSpine } from '../../enforcement/events.js';
import { loadRoleSkill } from '../../runner/role-loader.js';
import { assemblePrompt } from '../../enforcement/prompt-assembler.js';
import { runWithSDK } from '../../runner/sdk-runner.js';

export async function runCathedral(opts: {
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
    agent_id: `cathedral-${runId}`,
    stage: 'cathedral',
    role: 'cathedral',
  });

  if (dryRun) {
    // Write brief.md
    await fs.mkdir(path.dirname(paths.cathedral.brief), { recursive: true });
    await fs.writeFile(
      paths.cathedral.brief,
      `# Cathedral Brief\n\nrun_id: ${runId}\ntarget: ${targetPath}\n`,
      'utf-8',
    );

    // Write schematics index.json
    await fs.mkdir(path.dirname(paths.cathedral.schematics), { recursive: true });
    await fs.writeFile(
      paths.cathedral.schematics,
      JSON.stringify(
        {
          run_id: runId,
          subsystems: [],
          source_refs: [],
          generated_at: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf-8',
    );

    await spine.emit({
      event_type: 'UNIT_COMPLETE',
      run_id: runId,
      agent_id: `cathedral-${runId}`,
      stage: 'cathedral',
      role: 'cathedral',
    });

    return {
      ok: true,
      runId,
      stage: 'cathedral',
      outputPaths: {
        brief: paths.cathedral.brief,
        schematics: paths.cathedral.schematics,
      },
      costUsd: 0,
    };
  }

  // Real mode
  const roleSkill = await loadRoleSkill('cathedral');

  const runCard = {
    contract_type: 'forked_agent' as const,
    run_id: runId,
    agent_id: `cathedral-${runId}`,
    stage: 'cathedral' as const,
    role: 'cathedral',
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
        handle: 'target_path',
        path: targetPath,
        required: true,
        format: 'text' as const,
        schema_ref: null,
        owner_role: null,
      },
    ],
    outputs: [
      {
        handle: 'brief',
        path: paths.cathedral.brief,
        required: true,
        format: 'markdown' as const,
        schema_ref: null,
        owner_role: 'cathedral',
      },
      {
        handle: 'schematics',
        path: paths.cathedral.schematics,
        required: true,
        format: 'json' as const,
        schema_ref: null,
        owner_role: 'cathedral',
      },
    ],
    rules: [
      'Read only files within the declared input paths.',
      'Do not modify any source files in the target.',
      'Produce outputs exactly in the declared format.',
    ],
    acceptance_checks: [
      { description: 'brief.md must be non-empty markdown', required: true },
      { description: 'schematics/index.json must be valid JSON', required: true },
    ],
    next_consumer: { role: 'find', stage: 'find' },
  };

  const payload = `Analyze the codebase at: ${targetPath}\nLevel: ${level}\n\nProduce the cathedral brief and schematics index.`;

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
      stage: 'cathedral',
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
      stage: 'cathedral',
      outputPaths: {},
      costUsd: result.costUsd,
      error: result.error,
    };
  }

  // Validate outputs exist
  try {
    await fs.access(paths.cathedral.brief);
    await fs.access(paths.cathedral.schematics);
  } catch {
    return {
      ok: false,
      runId,
      stage: 'cathedral',
      outputPaths: {},
      costUsd: result.costUsd,
      error: 'OUTPUT_VALIDATION_FAILED: expected output files not found',
    };
  }

  await spine.emit({
    event_type: 'UNIT_COMPLETE',
    run_id: runId,
    agent_id: `cathedral-${runId}`,
    stage: 'cathedral',
    role: 'cathedral',
  });

  return {
    ok: true,
    runId,
    stage: 'cathedral',
    outputPaths: {
      brief: paths.cathedral.brief,
      schematics: paths.cathedral.schematics,
    },
    costUsd: result.costUsd,
  };
}
