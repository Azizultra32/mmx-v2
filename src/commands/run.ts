import { randomBytes } from 'crypto';
import { enforceLaws } from '../core/three-laws.js';
import { RunRegistry } from '../state/machine.js';
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

export async function run(opts: RunOptions): Promise<void> {
  const { targetPath, level = 1, dryRun = false } = opts;

  // Enforce Three Laws
  await enforceLaws({
    enginePath: process.cwd(),
    targetPath,
  });

  const runId = `mmx-${randomBytes(4).toString('hex')}`;
  const paths = new Paths(targetPath, runId);
  const registry = new RunRegistry(targetPath, runId);
  const spine = new EventSpine(paths.events.activity);

  await registry.init({ level, targetPath });

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
      process.exit(1);
    }

    if (!result.ok) {
      console.error(`[MMX] Stage ${stage.name} failed: ${result.error}`);
      await registry.transition('failed', { error: result.error });
      process.exit(1);
    }

    await registry.transition('complete', { stage: stage.name, costUsd: result.costUsd });
    console.log(`[MMX] Stage ${stage.name} OK (cost: $${result.costUsd.toFixed(4)})`);
  }

  await registry.transition('complete');
  console.log(`[MMX] Run complete: ${runId}`);
}
