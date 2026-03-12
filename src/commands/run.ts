import fs from 'fs/promises';
import path from 'path';
import { enforceLaws } from '../core/three-laws.js';
import { RunRegistry, TargetWorkspace } from '../state/machine.js';
import { EventSpine } from '../enforcement/events.js';
import { Paths } from '../core/paths.js';
import { runCathedral } from '../stages/cathedral/index.js';
import { runFind } from '../stages/find/index.js';
import { runDistill } from '../stages/distill/index.js';
import { runPredict } from '../stages/predict/index.js';
import { runPropose } from '../stages/propose/index.js';
import { runImplement } from '../stages/implement/index.js';
import { runFinalGuard } from '../stages/finalguard/index.js';
import { runHumanGate } from '../stages/humangate/index.js';
import type { StageResult } from '../core/types.js';

export interface RunOptions {
  targetPath: string;
  level?: number;
  dryRun?: boolean;
}

async function nextRunId(targetPath: string): Promise<string> {
  const runsDir = path.join(targetPath, '.mmx', 'runs');
  let count = 0;
  try {
    const entries = await fs.readdir(runsDir);
    count = entries.filter(e => /^run-\d{3}$/.test(e)).length;
  } catch {
    // runsDir doesn't exist yet — count stays 0
  }
  return `run-${String(count + 1).padStart(3, '0')}`;
}

export async function run(opts: RunOptions): Promise<void> {
  const { targetPath, level = 1, dryRun = false } = opts;

  // Enforce Three Laws
  await enforceLaws({
    enginePath: process.cwd(),
    targetPath,
  });

  const workspace = new TargetWorkspace(targetPath);

  // Init target on first run (no-op if target.json already exists)
  const existingTarget = await workspace.readTarget();
  if (!existingTarget) {
    await workspace.initTarget({
      targetId: path.basename(path.resolve(targetPath)),
      displayName: path.basename(path.resolve(targetPath)),
      sourceType: 'local',
      sourcePath: path.resolve(targetPath),
      engineVersion: '2.0.0',
    });
  }

  const runId = await nextRunId(targetPath);
  const paths = new Paths(targetPath, runId);
  const registry = new RunRegistry(targetPath, runId);
  const spine = new EventSpine(paths.events.activity);

  await registry.init({ level, targetPath });

  // Mark run as active
  await workspace.updateCurrent({ latestRunId: runId, activeRunId: runId });

  await spine.emit({
    event_type: 'RUN_CREATED',
    run_id: runId,
    agent_id: null,
    stage: null,
  });

  console.log(`[MMX] Run started: ${runId}`);
  console.log(`[MMX] Target: ${targetPath}`);
  console.log(`[MMX] Level: ${level}`);
  console.log(`[MMX] DryRun: ${dryRun}`);

  const stages: Array<{
    name: string;
    fn: () => Promise<StageResult>;
  }> = [
    {
      name: 'cathedral',
      fn: () => runCathedral({ targetPath, runId, level, dryRun }),
    },
    {
      name: 'find',
      fn: () => runFind({ targetPath, runId, level, dryRun }),
    },
    {
      name: 'distill',
      fn: () => runDistill({ targetPath, runId, dryRun }),
    },
    {
      name: 'predict',
      fn: () => runPredict({ targetPath, runId, dryRun }),
    },
    {
      name: 'propose',
      fn: () => runPropose({ targetPath, runId, dryRun }),
    },
    {
      name: 'implement',
      fn: () => runImplement({ targetPath, runId, dryRun }),
    },
    {
      name: 'finalguard',
      fn: () => runFinalGuard({ targetPath, runId, dryRun }),
    },
    {
      name: 'humangate',
      fn: () => runHumanGate({ targetPath, runId, dryRun }),
    },
  ];

  const runCreatedAt = new Date().toISOString();
  let lastStageReached: string | null = null;
  let totalCost = 0;

  for (const stage of stages) {
    console.log(`[MMX] Stage: ${stage.name}`);
    await registry.transition('running', { stage: stage.name });

    let result: StageResult;
    try {
      result = await stage.fn();
    } catch (err) {
      const errorMsg = String(err);
      console.error(`[MMX] Stage ${stage.name} threw: ${errorMsg}`);
      await registry.transition('failed', { error: errorMsg });
      const completedAt = new Date().toISOString();
      await workspace.updateCurrent({ activeRunId: null });
      await workspace.appendHistory({
        run_id: runId,
        created_at: runCreatedAt,
        completed_at: completedAt,
        status: 'failed',
        stage_reached: stage.name,
        cost_usd: totalCost,
      });
      process.exit(1);
    }

    if (!result.ok) {
      console.error(`[MMX] Stage ${stage.name} failed: ${result.error}`);
      await registry.transition('failed', { error: result.error });
      const completedAt = new Date().toISOString();
      await workspace.updateCurrent({ activeRunId: null });
      await workspace.appendHistory({
        run_id: runId,
        created_at: runCreatedAt,
        completed_at: completedAt,
        status: 'failed',
        stage_reached: stage.name,
        cost_usd: totalCost,
      });
      process.exit(1);
    }

    totalCost += result.costUsd;
    lastStageReached = stage.name;
    await registry.transition('complete', { stage: stage.name, costUsd: result.costUsd });
    console.log(`[MMX] Stage ${stage.name} OK (cost: $${result.costUsd.toFixed(4)})`);
  }

  await registry.transition('complete');
  const completedAt = new Date().toISOString();
  await workspace.updateCurrent({ activeRunId: null });
  await workspace.appendHistory({
    run_id: runId,
    created_at: runCreatedAt,
    completed_at: completedAt,
    status: 'complete',
    stage_reached: lastStageReached,
    cost_usd: totalCost,
  });
  console.log(`[MMX] Run complete: ${runId}`);
}
